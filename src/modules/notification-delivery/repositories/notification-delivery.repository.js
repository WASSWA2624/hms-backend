/**
 * NotificationDelivery repository
 *
 * @module modules/notification-delivery/repositories
 * @description Data access layer for notification-delivery operations.
 * Per module-creation.mdc: Only standard CRUD operations allowed in repositories.
 * Per prisma.mdc: All queries use soft delete filtering (deleted_at: null).
 */

const prisma = require('@prisma/client');
const { HttpError } = require('@lib/errors');

/**
 * Find notification-delivery by ID
 *
 * @param {string} id - NotificationDelivery ID
 * @param {Object} include - Relations to include
 * @returns {Promise<Object|null>} NotificationDelivery object or null
 */
const findById = async (id, include = {}) => {
  try {
    return await prisma.notification_delivery.findFirst({
      where: {
        id,
        deleted_at: null
      },
      include
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find many notification-deliveries with pagination
 *
 * @param {Object} filters - Filter criteria
 * @param {number} skip - Number of records to skip
 * @param {number} take - Number of records to take
 * @param {Object} orderBy - Sort order
 * @param {Object} include - Relations to include
 * @returns {Promise<Array>} Array of notification-deliveries
 */
const findMany = async (filters = {}, skip = 0, take = 20, orderBy = { created_at: 'desc' }, include = {}) => {
  try {
    // Build where clause
    const where = {
      deleted_at: null,
      ...filters
    };

    return await prisma.notification_delivery.findMany({
      where,
      skip,
      take,
      orderBy,
      include
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Count notification-deliveries with filters
 *
 * @param {Object} filters - Filter criteria
 * @returns {Promise<number>} Count of notification-deliveries
 */
const count = async (filters = {}) => {
  try {
    const where = {
      deleted_at: null,
      ...filters
    };

    return await prisma.notification_delivery.count({ where });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new notification-delivery
 *
 * @param {Object} data - NotificationDelivery data
 * @returns {Promise<Object>} Created notification-delivery
 */
const create = async (data) => {
  try {
    return await prisma.notification_delivery.create({
      data
    });
  } catch (error) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      const target = error.meta?.target?.[0] || 'field';
      throw new HttpError('errors.database.unique_field', 409, [{ field: target }]);
    }
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      const target = error.meta?.field_name || 'field';
      throw new HttpError('errors.database.foreign_key_field', 400, [{ field: target }]);
    }
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update notification-delivery
 *
 * @param {string} id - NotificationDelivery ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated notification-delivery
 */
const update = async (id, data) => {
  try {
    return await prisma.notification_delivery.update({
      where: { id },
      data
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new HttpError('errors.notification_delivery.not_found', 404);
    }
    if (error.code === 'P2002') {
      // Unique constraint violation
      const target = error.meta?.target?.[0] || 'field';
      throw new HttpError('errors.database.unique_field', 409, [{ field: target }]);
    }
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      const target = error.meta?.field_name || 'field';
      throw new HttpError('errors.database.foreign_key_field', 400, [{ field: target }]);
    }
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Soft delete notification-delivery
 * Per prisma.mdc: Only soft deletes allowed
 *
 * @param {string} id - NotificationDelivery ID
 * @returns {Promise<Object>} Deleted notification-delivery
 */
const softDelete = async (id) => {
  try {
    return await prisma.notification_delivery.update({
      where: { id },
      data: {
        deleted_at: new Date()
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new HttpError('errors.notification_delivery.not_found', 404);
    }
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  findById,
  findMany,
  count,
  create,
  update,
  softDelete
};
