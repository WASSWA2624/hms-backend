/**
 * Encounter service
 *
 * @module modules/encounter/services
 * @description Business logic layer for encounter operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const encounterRepository = require('../repositories/encounter.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List encounters with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Encounters and pagination data
 */
const listEncounters = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.patient_id) whereClause.patient_id = filters.patient_id;
    if (filters.provider_user_id) whereClause.provider_user_id = filters.provider_user_id;
    if (filters.encounter_type) whereClause.encounter_type = filters.encounter_type;
    if (filters.status) whereClause.status = filters.status;

    const [encounters, total] = await Promise.all([
      encounterRepository.findMany(whereClause, skip, limit, orderBy),
      encounterRepository.count(whereClause)
    ]);

    return {
      encounters,
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
 * Get encounter by ID
 *
 * @param {string} id - Encounter ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Encounter data
 */
const getEncounterById = async (id, userId, ipAddress) => {
  try {
    const encounter = await encounterRepository.findById(id);

    if (!encounter) {
      throw new HttpError('errors.encounter.not_found', 404);
    }

    return encounter;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new encounter
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Encounter data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created encounter
 */
const createEncounter = async (data, userId, ipAddress) => {
  try {
    const encounter = await encounterRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'encounter',
      entity_id: encounter.id,
      diff: { after: encounter },
      ip_address: ipAddress
    }).catch(() => {});

    return encounter;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update encounter
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Encounter ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated encounter
 */
const updateEncounter = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await encounterRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.encounter.not_found', 404);
    }

    const encounter = await encounterRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'encounter',
      entity_id: encounter.id,
      diff: { before, after: encounter },
      ip_address: ipAddress
    }).catch(() => {});

    return encounter;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete encounter (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Encounter ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteEncounter = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await encounterRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.encounter.not_found', 404);
    }

    await encounterRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'encounter',
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
  listEncounters,
  getEncounterById,
  createEncounter,
  updateEncounter,
  deleteEncounter
};
