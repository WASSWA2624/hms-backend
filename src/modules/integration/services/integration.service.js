/**
 * Integration service
 *
 * @module modules/integration/services
 * @description Business logic layer for integration operations.
 * Per module-creation.mdc: Services implement business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const integrationRepository = require('@repositories/integration/integration.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * Get integration by ID
 *
 * @param {string} id - Integration ID
 * @returns {Promise<Object>} Integration object
 * @throws {HttpError} 404 if integration not found
 */
const getIntegrationById = async (id) => {
  const integration = await integrationRepository.findById(id);
  
  if (!integration) {
    throw new HttpError('errors.integration.not_found', 404);
  }
  
  return integration;
};

/**
 * List integrations with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated integrations
 */
const listIntegrations = async (filters = {}, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };
  
  // Build filter object
  const where = {};
  
  if (filters.tenant_id) {
    where.tenant_id = filters.tenant_id;
  }
  
  if (filters.integration_type) {
    where.integration_type = filters.integration_type;
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.name) {
    where.name = {
      contains: filters.name
    };
  }
  
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } }
    ];
  }
  
  const [integrations, total] = await Promise.all([
    integrationRepository.findMany(where, skip, limit, orderBy),
    integrationRepository.count(where)
  ]);
  
  return {
    data: integrations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    }
  };
};

/**
 * Create new integration
 *
 * @param {Object} data - Integration data
 * @param {Object} auditContext - Audit context (user_id, tenant_id, ip_address)
 * @returns {Promise<Object>} Created integration
 */
const createIntegration = async (data, auditContext) => {
  const integration = await integrationRepository.create(data);
  
  // Per module-creation.mdc: All mutations must call createAuditLog
  await createAuditLog({
    action: 'CREATE',
    entity: 'integration',
    entity_id: integration.id,
    new_values: integration,
    ...auditContext
  });
  
  return integration;
};

/**
 * Update integration
 *
 * @param {string} id - Integration ID
 * @param {Object} data - Update data
 * @param {Object} auditContext - Audit context (user_id, tenant_id, ip_address)
 * @returns {Promise<Object>} Updated integration
 * @throws {HttpError} 404 if integration not found
 */
const updateIntegration = async (id, data, auditContext) => {
  // Verify integration exists
  const existingIntegration = await getIntegrationById(id);
  
  const updated = await integrationRepository.update(id, data);
  
  // Per module-creation.mdc: All mutations must call createAuditLog
  await createAuditLog({
    action: 'UPDATE',
    entity: 'integration',
    entity_id: id,
    old_values: existingIntegration,
    new_values: updated,
    ...auditContext
  });
  
  return updated;
};

/**
 * Delete integration (soft delete)
 *
 * @param {string} id - Integration ID
 * @param {Object} auditContext - Audit context (user_id, tenant_id, ip_address)
 * @returns {Promise<Object>} Deleted integration
 * @throws {HttpError} 404 if integration not found
 */
const deleteIntegration = async (id, auditContext) => {
  // Verify integration exists
  const existingIntegration = await getIntegrationById(id);
  
  const deleted = await integrationRepository.softDelete(id);
  
  // Per module-creation.mdc: All mutations must call createAuditLog
  await createAuditLog({
    action: 'DELETE',
    entity: 'integration',
    entity_id: id,
    old_values: existingIntegration,
    ...auditContext
  });
  
  return deleted;
};

module.exports = {
  getIntegrationById,
  listIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration
};
