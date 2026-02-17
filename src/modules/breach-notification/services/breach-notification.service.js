/**
 * Breach notification service
 *
 * @module modules/breach-notification/services
 * @description Business logic layer for breach notification operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const breachNotificationRepository = require('@repositories/breach-notification/breach-notification.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List breach notifications with pagination and filtering
 */
const listBreachNotifications = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { reported_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.severity) whereClause.severity = filters.severity;
    if (filters.status) whereClause.status = filters.status;
    
    // Date range filters
    if (filters.from_date || filters.to_date) {
      whereClause.reported_at = {};
      if (filters.from_date) whereClause.reported_at.gte = new Date(filters.from_date);
      if (filters.to_date) whereClause.reported_at.lte = new Date(filters.to_date);
    }

    const [breachNotifications, total] = await Promise.all([
      breachNotificationRepository.findMany(whereClause, skip, limit, orderBy),
      breachNotificationRepository.count(whereClause)
    ]);

    return {
      breachNotifications,
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
 * Get breach notification by ID
 */
const getBreachNotificationById = async (id, userId, ipAddress) => {
  try {
    const breachNotification = await breachNotificationRepository.findById(id);

    if (!breachNotification) {
      throw new HttpError('errors.breach_notification.not_found', 404);
    }

    return breachNotification;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new breach notification
 * Per prisma.mdc: Mutations must create audit logs
 */
const createBreachNotification = async (data, tenantId, userId, ipAddress) => {
  try {
    const breachNotification = await breachNotificationRepository.create({
      ...data,
      tenant_id: tenantId
    });

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'breach_notification',
      entity_id: breachNotification.id,
      diff: { after: breachNotification },
      ip_address: ipAddress
    }).catch(() => {});

    return breachNotification;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update breach notification
 * Per prisma.mdc: Mutations must create audit logs
 */
const updateBreachNotification = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await breachNotificationRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.breach_notification.not_found', 404);
    }

    const breachNotification = await breachNotificationRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'breach_notification',
      entity_id: breachNotification.id,
      diff: { before, after: breachNotification },
      ip_address: ipAddress
    }).catch(() => {});

    return breachNotification;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Resolve breach notification
 * Special action endpoint: POST /breach-notifications/:id/resolve
 * Per prisma.mdc: Mutations must create audit logs
 */
const resolveBreachNotification = async (id, resolvedAt, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await breachNotificationRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.breach_notification.not_found', 404);
    }

    // Check if already resolved
    if (before.status === 'RESOLVED') {
      throw new HttpError('errors.breach_notification.already_resolved', 400);
    }

    const breachNotification = await breachNotificationRepository.update(id, {
      status: 'RESOLVED',
      resolved_at: resolvedAt || new Date()
    });

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'RESOLVE',
      entity: 'breach_notification',
      entity_id: breachNotification.id,
      diff: { before, after: breachNotification },
      ip_address: ipAddress
    }).catch(() => {});

    return breachNotification;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete breach notification (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 */
const deleteBreachNotification = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await breachNotificationRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.breach_notification.not_found', 404);
    }

    await breachNotificationRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'breach_notification',
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
  listBreachNotifications,
  getBreachNotificationById,
  createBreachNotification,
  updateBreachNotification,
  resolveBreachNotification,
  deleteBreachNotification
};
