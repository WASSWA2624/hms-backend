/**
 * Emergency case service
 *
 * @module modules/emergency-case/services
 * @description Business logic layer for emergency case operations.
 * Per module-creation.mdc: Only import and use its own repository.
 * Per module-creation.mdc: All mutations must call audit log.
 */

const emergencyCaseRepository = require('@repositories/emergency-case/emergency-case.repository');
const { HttpError } = require('@lib/errors');
const { createAuditLog } = require('@lib/audit');

/**
 * List emergency cases with pagination
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated emergency cases
 */
const listEmergencyCases = async (filters = {}, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };

  const [items, total] = await Promise.all([
    emergencyCaseRepository.findMany(filters, skip, limit, orderBy),
    emergencyCaseRepository.count(filters)
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Get emergency case by ID
 *
 * @param {string} id - Emergency case ID
 * @returns {Promise<Object>} Emergency case object
 * @throws {HttpError} If emergency case not found
 */
const getEmergencyCaseById = async (id) => {
  const emergencyCase = await emergencyCaseRepository.findById(id);
  
  if (!emergencyCase) {
    throw new HttpError('errors.emergency_case.not_found', 404);
  }

  return emergencyCase;
};

/**
 * Create new emergency case
 *
 * @param {Object} data - Emergency case data
 * @param {Object} user - User performing the action (for audit)
 * @returns {Promise<Object>} Created emergency case
 */
const createEmergencyCase = async (data, user) => {
  const emergencyCase = await emergencyCaseRepository.create(data);

  await createAuditLog({
    action: 'CREATE',
    resource: 'emergency_case',
    resource_id: emergencyCase.id,
    user_id: user.id,
    tenant_id: data.tenant_id,
    details: { data }
  });

  return emergencyCase;
};

/**
 * Update emergency case
 *
 * @param {string} id - Emergency case ID
 * @param {Object} data - Update data
 * @param {Object} user - User performing the action (for audit)
 * @returns {Promise<Object>} Updated emergency case
 * @throws {HttpError} If emergency case not found
 */
const updateEmergencyCase = async (id, data, user) => {
  const existing = await emergencyCaseRepository.findById(id);
  if (!existing) {
    throw new HttpError('errors.emergency_case.not_found', 404);
  }

  const updated = await emergencyCaseRepository.update(id, data);

  await createAuditLog({
    action: 'UPDATE',
    resource: 'emergency_case',
    resource_id: id,
    user_id: user.id,
    tenant_id: existing.tenant_id,
    details: { before: existing, after: data }
  });

  return updated;
};

/**
 * Delete emergency case (soft delete)
 *
 * @param {string} id - Emergency case ID
 * @param {Object} user - User performing the action (for audit)
 * @returns {Promise<Object>} Deleted emergency case
 * @throws {HttpError} If emergency case not found
 */
const deleteEmergencyCase = async (id, user) => {
  const existing = await emergencyCaseRepository.findById(id);
  if (!existing) {
    throw new HttpError('errors.emergency_case.not_found', 404);
  }

  const deleted = await emergencyCaseRepository.softDelete(id);

  await createAuditLog({
    action: 'DELETE',
    resource: 'emergency_case',
    resource_id: id,
    user_id: user.id,
    tenant_id: existing.tenant_id,
    details: { data: existing }
  });

  return deleted;
};

module.exports = {
  listEmergencyCases,
  getEmergencyCaseById,
  createEmergencyCase,
  updateEmergencyCase,
  deleteEmergencyCase
};
