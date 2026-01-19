/**
 * Report run repository
 *
 * @module modules/report-run/repositories
 * @description Data access layer for report run operations.
 * Per module-creation.mdc: Only standard CRUD operations allowed in repositories.
 * Per prisma.mdc: All queries use soft delete filtering (deleted_at: null).
 */

const prisma = require('@prisma/client');
const { HttpError } = require('@lib/errors');

/**
 * Find report run by ID
 *
 * @param {string} id - Report run ID
 * @returns {Promise<Object|null>} Report run object or null
 */
const findById = async (id) => {
  try {
    return await prisma.report_run.findFirst({
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
        report_definition: {
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
 * Find many report runs with pagination
 *
 * @param {Object} filters - Filter criteria
 * @param {number} skip - Number of records to skip
 * @param {number} take - Number of records to take
 * @param {Object} orderBy - Sort order
 * @returns {Promise<Array>} Array of report runs
 */
const findMany = async (filters = {}, skip = 0, take = 20, orderBy = { created_at: 'desc' }) => {
  try {
    // Build where clause
    const where = {
      deleted_at: null,
      ...filters
    };

    return await prisma.report_run.findMany({
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
        report_definition: {
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
 * Count report runs with filters
 *
 * @param {Object} filters - Filter criteria
 * @returns {Promise<number>} Count of report runs
 */
const count = async (filters = {}) => {
  try {
    const where = {
      deleted_at: null,
      ...filters
    };

    return await prisma.report_run.count({ where });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new report run
 *
 * @param {Object} data - Report run data
 * @returns {Promise<Object>} Created report run
 */
const create = async (data) => {
  try {
    return await prisma.report_run.create({
      data,
      include: {
        tenant: {
          select: {
            id: true,
            name: true
          }
        },
        report_definition: {
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
 * Update report run
 *
 * @param {string} id - Report run ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated report run
 */
const update = async (id, data) => {
  try {
    return await prisma.report_run.update({
      where: { id },
      data,
      include: {
        tenant: {
          select: {
            id: true,
            name: true
          }
        },
        report_definition: {
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
      throw new HttpError('errors.report_run.not_found', 404);
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
 * Soft delete report run
 * Per prisma.mdc: Only soft deletes allowed
 *
 * @param {string} id - Report run ID
 * @returns {Promise<Object>} Deleted report run
 */
const softDelete = async (id) => {
  try {
    return await prisma.report_run.update({
      where: { id },
      data: {
        deleted_at: new Date()
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new HttpError('errors.report_run.not_found', 404);
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
