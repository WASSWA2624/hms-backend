/**
 * Emergency response service
 *
 * @module modules/emergency-response/services
 * @description Business logic layer for emergency response operations.
 * Per module-creation.mdc: Only import and use its own repository.
 * Per module-creation.mdc: All mutations must call audit log.
 */

const emergencyResponseRepository = require('@modules/emergency-response/repositories/emergency-response.repository');
const { HttpError } = require('@lib/errors');
const { createAuditLog } = require('@lib/audit');
const prisma = require('@prisma/client');

/**
 * List emergency responses with pagination
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated emergency responses
 */
const listEmergencyResponses = async (filters = {}, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };

  const [items, total] = await Promise.all([
    emergencyResponseRepository.findMany(filters, skip, limit, orderBy),
    emergencyResponseRepository.count(filters)
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
 * Get emergency response by ID
 *
 * @param {string} id - Emergency response ID
 * @returns {Promise<Object>} Emergency response object
 * @throws {HttpError} If emergency response not found
 */
const getEmergencyResponseById = async (id) => {
  const emergencyResponse = await emergencyResponseRepository.findById(id);
  
  if (!emergencyResponse) {
    throw new HttpError('errors.emergency_response.not_found', 404);
  }

  return emergencyResponse;
};

/**
 * Create new emergency response
 *
 * @param {Object} data - Emergency response data
 * @param {Object} user - User performing the action (for audit)
 * @returns {Promise<Object>} Created emergency response
 */
const createEmergencyResponse = async (data, user) => {
  return await prisma.$transaction(async (tx) => {
    // Create emergency response
    const emergencyResponse = await emergencyResponseRepository.create(data);

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'emergency_response',
      resource_id: emergencyResponse.id,
      user_id: user.id,
      tenant_id: user.tenant_id,
      details: { data }
    });

    return emergencyResponse;
  });
};

/**
 * Update emergency response
 *
 * @param {string} id - Emergency response ID
 * @param {Object} data - Update data
 * @param {Object} user - User performing the action (for audit)
 * @returns {Promise<Object>} Updated emergency response
 * @throws {HttpError} If emergency response not found
 */
const updateEmergencyResponse = async (id, data, user) => {
  return await prisma.$transaction(async (tx) => {
    // Check if exists
    const existing = await emergencyResponseRepository.findById(id);
    if (!existing) {
      throw new HttpError('errors.emergency_response.not_found', 404);
    }

    // Update
    const updated = await emergencyResponseRepository.update(id, data);

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      resource: 'emergency_response',
      resource_id: id,
      user_id: user.id,
      tenant_id: user.tenant_id,
      details: { before: existing, after: data }
    });

    return updated;
  });
};

/**
 * Delete emergency response (soft delete)
 *
 * @param {string} id - Emergency response ID
 * @param {Object} user - User performing the action (for audit)
 * @returns {Promise<Object>} Deleted emergency response
 * @throws {HttpError} If emergency response not found
 */
const deleteEmergencyResponse = async (id, user) => {
  return await prisma.$transaction(async (tx) => {
    // Check if exists
    const existing = await emergencyResponseRepository.findById(id);
    if (!existing) {
      throw new HttpError('errors.emergency_response.not_found', 404);
    }

    // Soft delete
    const deleted = await emergencyResponseRepository.softDelete(id);

    // Audit log
    await createAuditLog({
      action: 'DELETE',
      resource: 'emergency_response',
      resource_id: id,
      user_id: user.id,
      tenant_id: user.tenant_id,
      details: { data: existing }
    });

    return deleted;
  });
};

module.exports = {
  listEmergencyResponses,
  getEmergencyResponseById,
  createEmergencyResponse,
  updateEmergencyResponse,
  deleteEmergencyResponse
};
