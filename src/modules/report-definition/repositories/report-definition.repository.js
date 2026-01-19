/**
 * Report definition repository
 *
 * @module modules/report-definition/repositories
 * @description Data access layer for report definition operations.
 * Per module-creation.mdc: Only standard CRUD operations allowed in repositories.
 * Per prisma.mdc: All queries use soft delete filtering (deleted_at: null).
 */

const prisma = require('@prisma/client');
const { HttpError } = require('@lib/errors');

/**
 * Find report definition by ID
 *
 * @param {string} id - Report definition ID
 * @returns {Promise<Object|null>} Report definition object or null
 */
const findById = async (id) => {
  try {
    return await prisma.report_definition.findFirst({
      where: {
        id,
        deleted_at: null
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true
          }
        },
        facility: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find many report definitions with pagination
 *
 * @param {Object} filters - Filter criteria
 * @param {number} skip - Number of records to skip
 * @param {number} take - Number of records to take
 * @param {Object} orderBy - Sort order
 * @returns {Promise<Array>} Array of report definitions
 */
const findMany = async (filters = {}, skip = 0, take = 20, orderBy = { created_at: 'desc' }) => {
  try {
    // Build where clause
    const where = {
      deleted_at: null,
      ...filters
    };

    return await prisma.report_definition.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        tenant: {
          select: {
            id: true,
            name: true
          }
        },
        facility: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Count report definitions with filters
 *
 * @param {Object} filters - Filter criteria
 * @returns {Promise<number>} Count of report definitions
 */
const count = async (filters = {}) => {
  try {
    const where = {
      deleted_at: null,
      ...filters
    };

    return await prisma.report_definition.count({ where });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new report definition
 *
 * @param {Object} data - Report definition data
 * @returns {Promise<Object>} Created report definition
 */
const create = async (data) => {
  try {
    return await prisma.report_definition.create({
      data,
      include: {
        tenant: {
          select: {
            id: true,
            name: true
          }
        },
        facility: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            email: true
          }
        }
      }
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
 * Update report definition
 *
 * @param {string} id - Report definition ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated report definition
 */
const update = async (id, data) => {
  try {
    return await prisma.report_definition.update({
      where: { id },
      data,
      include: {
        tenant: {
          select: {
            id: true,
            name: true
          }
        },
        facility: {
          select: {
            id: true,
            name: true
          }
        },
        creator: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new HttpError('errors.report_definition.not_found', 404);
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
 * Soft delete report definition
 * Per prisma.mdc: Only soft deletes allowed
 *
 * @param {string} id - Report definition ID
 * @returns {Promise<Object>} Deleted report definition
 */
const softDelete = async (id) => {
  try {
    return await prisma.report_definition.update({
      where: { id },
      data: {
        deleted_at: new Date()
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new HttpError('errors.report_definition.not_found', 404);
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
