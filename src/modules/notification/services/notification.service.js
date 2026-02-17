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
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.user_id) whereClause.user_id = filters.user_id;
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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1
      }
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
    const notification = await notificationRepository.findById(id);

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
    const notification = await notificationRepository.create(data);

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
    const before = await notificationRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.notification.not_found', 404);
    }

    const notification = await notificationRepository.update(id, data);

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
    const before = await notificationRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.notification.not_found', 404);
    }

    await notificationRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'notification',
      entity_id: id,
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
