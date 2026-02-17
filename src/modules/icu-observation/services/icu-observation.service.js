/**
 * ICU Observation service
 *
 * @module modules/icu-observation/services
 * @description Business logic layer for ICU observation operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const icuObservationRepository = require('@repositories/icu-observation/icu-observation.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List ICU observations with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} ICU observations and pagination data
 */
const listIcuObservations = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.icu_stay_id) whereClause.icu_stay_id = filters.icu_stay_id;
    
    // Date range filters for observed_at
    if (filters.observed_at_from || filters.observed_at_to) {
      whereClause.observed_at = {};
      if (filters.observed_at_from) whereClause.observed_at.gte = new Date(filters.observed_at_from);
      if (filters.observed_at_to) whereClause.observed_at.lte = new Date(filters.observed_at_to);
    }
    
    // Search filter (searches in observation text)
    if (filters.search) {
      whereClause.observation = { contains: filters.search };
    }

    const [icuObservations, total] = await Promise.all([
      icuObservationRepository.findMany(whereClause, skip, limit, orderBy),
      icuObservationRepository.count(whereClause)
    ]);

    return {
      icu_observations: icuObservations,
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
 * Get ICU observation by ID
 *
 * @param {string} id - ICU Observation ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} ICU observation data
 */
const getIcuObservationById = async (id, userId, ipAddress) => {
  try {
    const icuObservation = await icuObservationRepository.findById(id);

    if (!icuObservation) {
      throw new HttpError('errors.icu_observation.not_found', 404);
    }

    return icuObservation;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new ICU observation
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - ICU observation data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created ICU observation
 */
const createIcuObservation = async (data, userId, ipAddress) => {
  try {
    const icuObservation = await icuObservationRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'icu_observation',
      entity_id: icuObservation.id,
      diff: { after: icuObservation },
      ip_address: ipAddress
    }).catch(() => {});

    return icuObservation;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update ICU observation
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - ICU Observation ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated ICU observation
 */
const updateIcuObservation = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await icuObservationRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.icu_observation.not_found', 404);
    }

    const icuObservation = await icuObservationRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'icu_observation',
      entity_id: icuObservation.id,
      diff: { before, after: icuObservation },
      ip_address: ipAddress
    }).catch(() => {});

    return icuObservation;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete ICU observation (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - ICU Observation ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteIcuObservation = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await icuObservationRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.icu_observation.not_found', 404);
    }

    await icuObservationRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'icu_observation',
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
  listIcuObservations,
  getIcuObservationById,
  createIcuObservation,
  updateIcuObservation,
  deleteIcuObservation
};
