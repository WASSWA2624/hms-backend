/**
 * Ambulance Trip repository
 *
 * @module modules/ambulance-trip/repositories
 * @description Data access layer for ambulance trip operations.
 * Per module-creation.mdc: Only standard CRUD operations allowed in repositories.
 * Per prisma.mdc: All queries use soft delete filtering (deleted_at: null).
 */

const prisma = require('@prisma/client');
const { HttpError } = require('@lib/errors');

/**
 * Find ambulance trip by ID
 *
 * @param {string} id - Ambulance Trip ID
 * @returns {Promise<Object|null>} Ambulance Trip object or null
 */
const findById = async (id) => {
  try {
    return await prisma.ambulance_trip.findFirst({
      where: {
        id,
        deleted_at: null
      }
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find many ambulance trips with pagination
 *
 * @param {Object} filters - Filter criteria
 * @param {number} skip - Number of records to skip
 * @param {number} take - Number of records to take
 * @param {Object} orderBy - Sort order
 * @returns {Promise<Array>} Array of ambulance trips
 */
const findMany = async (filters = {}, skip = 0, take = 20, orderBy = { created_at: 'desc' }) => {
  try {
    // Build where clause
    const where = {
      deleted_at: null,
      ...filters
    };

    return await prisma.ambulance_trip.findMany({
      where,
      skip,
      take,
      orderBy
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Count ambulance trips with filters
 *
 * @param {Object} filters - Filter criteria
 * @returns {Promise<number>} Count of ambulance trips
 */
const count = async (filters = {}) => {
  try {
    const where = {
      deleted_at: null,
      ...filters
    };

    return await prisma.ambulance_trip.count({ where });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new ambulance trip
 *
 * @param {Object} data - Ambulance Trip data
 * @returns {Promise<Object>} Created ambulance trip
 */
const create = async (data) => {
  try {
    return await prisma.ambulance_trip.create({
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
 * Update ambulance trip
 *
 * @param {string} id - Ambulance Trip ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated ambulance trip
 */
const update = async (id, data) => {
  try {
    return await prisma.ambulance_trip.update({
      where: { id },
      data
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new HttpError('errors.ambulance_trip.not_found', 404);
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
 * Soft delete ambulance trip
 * Per prisma.mdc: Only soft deletes allowed
 *
 * @param {string} id - Ambulance Trip ID
 * @returns {Promise<Object>} Deleted ambulance trip
 */
const softDelete = async (id) => {
  try {
    return await prisma.ambulance_trip.update({
      where: { id },
      data: {
        deleted_at: new Date()
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new HttpError('errors.ambulance_trip.not_found', 404);
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
