/**
 * Patient repository
 *
 * @module modules/patient/repositories
 * @description Data access layer for patient operations.
 * Per module-creation.mdc: Only standard CRUD operations allowed in repositories.
 * Per prisma.mdc: All queries use soft delete filtering (deleted_at: null).
 */

const prisma = require('@prisma/client');
const { HttpError } = require('@lib/errors');

const normalizeScopeFilters = (scope = {}) => {
  const normalized = {};

  if (typeof scope.tenant_id === 'string' && scope.tenant_id.trim()) {
    normalized.tenant_id = scope.tenant_id.trim();
  }
  if (typeof scope.facility_id === 'string' && scope.facility_id.trim()) {
    normalized.facility_id = scope.facility_id.trim();
  }

  return normalized;
};

const resolveCanonicalPatientId = async (id, scope = {}) => {
  const existing = await findById(id, {}, scope);
  return existing?.id || null;
};

/**
 * Find patient by ID
 *
 * @param {string} id - Patient ID
 * @param {Object} include - Relations to include
 * @param {Object} scope - Optional scope filters (tenant_id, facility_id)
 * @returns {Promise<Object|null>} Patient object or null
 */
const findById = async (id, include = {}, scope = {}) => {
  try {
    const scopeFilters = normalizeScopeFilters(scope);

    return await prisma.patient.findFirst({
      where: {
        id,
        deleted_at: null,
        ...scopeFilters
      },
      include
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find many patients with pagination
 *
 * @param {Object} filters - Filter criteria
 * @param {number} skip - Number of records to skip
 * @param {number} take - Number of records to take
 * @param {Object} orderBy - Sort order
 * @param {Object} include - Relations to include
 * @returns {Promise<Array>} Array of patients
 */
const findMany = async (filters = {}, skip = 0, take = 20, orderBy = { created_at: 'desc' }, include = {}) => {
  try {
    // Build where clause
    const where = {
      deleted_at: null,
      ...filters
    };

    return await prisma.patient.findMany({
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
 * Count patients with filters
 *
 * @param {Object} filters - Filter criteria
 * @returns {Promise<number>} Count of patients
 */
const count = async (filters = {}) => {
  try {
    const where = {
      deleted_at: null,
      ...filters
    };

    return await prisma.patient.count({ where });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new patient
 *
 * @param {Object} data - Patient data
 * @returns {Promise<Object>} Created patient
 */
const create = async (data) => {
  try {
    return await prisma.patient.create({
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
 * Update patient
 *
 * @param {string} id - Patient ID
 * @param {Object} data - Update data
 * @param {Object} scope - Optional scope filters (tenant_id, facility_id)
 * @returns {Promise<Object>} Updated patient
 */
const update = async (id, data, scope = {}) => {
  try {
    const canonicalId = await resolveCanonicalPatientId(id, scope);
    if (!canonicalId) {
      throw new HttpError('errors.patient.not_found', 404);
    }

    return await prisma.patient.update({
      where: { id: canonicalId },
      data
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    if (error.code === 'P2025') {
      throw new HttpError('errors.patient.not_found', 404);
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
 * Soft delete patient
 * Per prisma.mdc: Only soft deletes allowed
 *
 * @param {string} id - Patient ID
 * @param {Object} scope - Optional scope filters (tenant_id, facility_id)
 * @returns {Promise<Object>} Deleted patient
 */
const softDelete = async (id, scope = {}) => {
  try {
    const canonicalId = await resolveCanonicalPatientId(id, scope);
    if (!canonicalId) {
      throw new HttpError('errors.patient.not_found', 404);
    }

    return await prisma.patient.update({
      where: { id: canonicalId },
      data: {
        deleted_at: new Date()
      }
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    if (error.code === 'P2025') {
      throw new HttpError('errors.patient.not_found', 404);
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
