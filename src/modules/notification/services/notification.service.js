/**
 * Notification service
 *
 * @module modules/notification/services
 * @description Business logic layer for notification operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const notificationRepository = require('@repositories/notification/notification.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeIdentifier = (value) => (typeof value === 'string' ? value.trim() : '');
const isUuid = (value) => UUID_REGEX.test(normalizeIdentifier(value));

const buildPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

const buildEmptyListResult = (page, limit) => ({
  notifications: [],
  pagination: buildPagination(page, limit, 0),
});

const resolveTenantIdentifierForFilter = async (identifier) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return { matched: true, id: null };
  if (isUuid(normalized)) return { matched: true, id: normalized };

  const tenant = await notificationRepository.findTenantByIdentifier(normalized);
  if (!tenant) return { matched: false, id: null };
  return { matched: true, id: tenant.id };
};

const resolveUserIdentifierForFilter = async (identifier, tenantId = null) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return { matched: true, id: null };
  if (isUuid(normalized)) return { matched: true, id: normalized };

  const user = await notificationRepository.findUserByIdentifier(normalized, tenantId);
  if (!user) return { matched: false, id: null };
  return { matched: true, id: user.id };
};

const resolveTenantIdentifierOrThrow = async (identifier) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) {
    throw new HttpError('errors.validation.field.required', 400, [{ field: 'tenant_id' }]);
  }

  if (isUuid(normalized)) return normalized;

  const tenant = await notificationRepository.findTenantByIdentifier(normalized);
  if (!tenant) {
    throw new HttpError('errors.tenant.not_found', 404, [{ field: 'tenant_id' }]);
  }
  return tenant.id;
};

const resolveUserIdentifierOrThrow = async (identifier, tenantId = null) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) {
    throw new HttpError('errors.validation.field.required', 400, [{ field: 'user_id' }]);
  }

  if (isUuid(normalized)) return normalized;

  const user = await notificationRepository.findUserByIdentifier(normalized, tenantId);
  if (!user) {
    throw new HttpError('errors.user.not_found', 404, [{ field: 'user_id' }]);
  }
  return user.id;
};

const findNotificationByIdentifier = async (identifier) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;

  if (isUuid(normalized)) {
    return notificationRepository.findById(normalized);
  }

  return notificationRepository.findByIdentifier(normalized);
};

/**
 * List notifications with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Notifications and pagination data
 */
const listNotifications = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};

    const tenantFilter = await resolveTenantIdentifierForFilter(filters.tenant_id);
    if (!tenantFilter.matched) return buildEmptyListResult(page, limit);
    if (tenantFilter.id) whereClause.tenant_id = tenantFilter.id;

    const userFilter = await resolveUserIdentifierForFilter(filters.user_id, tenantFilter.id);
    if (!userFilter.matched) return buildEmptyListResult(page, limit);
    if (userFilter.id) whereClause.user_id = userFilter.id;

    if (filters.notification_type) whereClause.notification_type = filters.notification_type;
    if (filters.priority) whereClause.priority = filters.priority;
    
    // Filter by read status
    if (filters.is_read !== undefined) {
      if (filters.is_read) {
        whereClause.read_at = { not: null };
      } else {
        whereClause.read_at = null;
      }
    }

    const [notifications, total] = await Promise.all([
      notificationRepository.findMany(whereClause, skip, limit, orderBy),
      notificationRepository.count(whereClause)
    ]);

    return {
      notifications,
      pagination: buildPagination(page, limit, total)
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Get notification by ID
 *
 * @param {string} id - Notification ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Notification data
 */
const getNotificationById = async (id, userId, ipAddress) => {
  try {
    const notification = await findNotificationByIdentifier(id);

    if (!notification) {
      throw new HttpError('errors.notification.not_found', 404);
    }

    return notification;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new notification
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Notification data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async (data, userId, ipAddress) => {
  try {
    const payload = { ...data };

    payload.tenant_id = await resolveTenantIdentifierOrThrow(payload.tenant_id);

    if (Object.prototype.hasOwnProperty.call(payload, 'user_id')) {
      if (payload.user_id === null) {
        payload.user_id = null;
      } else if (payload.user_id !== undefined) {
        payload.user_id = await resolveUserIdentifierOrThrow(payload.user_id, payload.tenant_id);
      }
    }

    const notification = await notificationRepository.create(payload);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'notification',
      entity_id: notification.id,
      diff: { after: notification },
      ip_address: ipAddress
    }).catch(() => {});

    return notification;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update notification
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Notification ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated notification
 */
const updateNotification = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await findNotificationByIdentifier(id);

    if (!before) {
      throw new HttpError('errors.notification.not_found', 404);
    }

    const payload = { ...data };

    if (Object.prototype.hasOwnProperty.call(payload, 'user_id')) {
      if (payload.user_id === null) {
        payload.user_id = null;
      } else if (payload.user_id !== undefined) {
        payload.user_id = await resolveUserIdentifierOrThrow(payload.user_id, before.tenant_id || null);
      }
    }

    const notification = await notificationRepository.update(before.id, payload);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'notification',
      entity_id: notification.id,
      diff: { before, after: notification },
      ip_address: ipAddress
    }).catch(() => {});

    return notification;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete notification (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Notification ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteNotification = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await findNotificationByIdentifier(id);

    if (!before) {
      throw new HttpError('errors.notification.not_found', 404);
    }

    await notificationRepository.softDelete(before.id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'notification',
      entity_id: before.id,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  deleteNotification
};
