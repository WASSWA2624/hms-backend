/**
 * NotificationDelivery service
 *
 * @module modules/notification-delivery/services
 * @description Business logic layer for notification-delivery operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const notificationDeliveryRepository = require('../repositories/notification-delivery.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List notification-deliveries with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} NotificationDeliveries and pagination data
 */
const listNotificationDeliveries = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.notification_id) whereClause.notification_id = filters.notification_id;
    if (filters.channel) whereClause.channel = filters.channel;
    if (filters.status) whereClause.status = filters.status;

    const [notificationDeliveries, total] = await Promise.all([
      notificationDeliveryRepository.findMany(whereClause, skip, limit, orderBy),
      notificationDeliveryRepository.count(whereClause)
    ]);

    return {
      notificationDeliveries,
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
 * Get notification-delivery by ID
 *
 * @param {string} id - NotificationDelivery ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} NotificationDelivery data
 */
const getNotificationDeliveryById = async (id, userId, ipAddress) => {
  try {
    const notificationDelivery = await notificationDeliveryRepository.findById(id);

    if (!notificationDelivery) {
      throw new HttpError('errors.notification_delivery.not_found', 404);
    }

    return notificationDelivery;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new notification-delivery
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - NotificationDelivery data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created notification-delivery
 */
const createNotificationDelivery = async (data, userId, ipAddress) => {
  try {
    const notificationDelivery = await notificationDeliveryRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'notification_delivery',
      entity_id: notificationDelivery.id,
      diff: { after: notificationDelivery },
      ip_address: ipAddress
    }).catch(() => {});

    return notificationDelivery;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update notification-delivery
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - NotificationDelivery ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated notification-delivery
 */
const updateNotificationDelivery = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await notificationDeliveryRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.notification_delivery.not_found', 404);
    }

    const notificationDelivery = await notificationDeliveryRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'notification_delivery',
      entity_id: notificationDelivery.id,
      diff: { before, after: notificationDelivery },
      ip_address: ipAddress
    }).catch(() => {});

    return notificationDelivery;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete notification-delivery (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - NotificationDelivery ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteNotificationDelivery = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await notificationDeliveryRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.notification_delivery.not_found', 404);
    }

    await notificationDeliveryRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'notification_delivery',
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
  listNotificationDeliveries,
  getNotificationDeliveryById,
  createNotificationDelivery,
  updateNotificationDelivery,
  deleteNotificationDelivery
};
