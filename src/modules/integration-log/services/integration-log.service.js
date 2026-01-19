/**
 * Integration log service
 *
 * @module modules/integration-log/services
 * @description Business logic layer for integration log operations.
 * Per module-creation.mdc: Services implement business logic and call repositories.
 * Note: This is a READ-ONLY module (no create/update/delete operations)
 */

const integrationLogRepository = require('@repositories/integration-log/integration-log.repository');
const { HttpError } = require('@lib/errors');

/**
 * Get integration log by ID
 *
 * @param {string} id - Integration log ID
 * @returns {Promise<Object>} Integration log object
 * @throws {HttpError} 404 if integration log not found
 */
const getIntegrationLogById = async (id) => {
  const integrationLog = await integrationLogRepository.findById(id, {
    integration: true
  });
  
  if (!integrationLog) {
    throw new HttpError('errors.integration_log.not_found', 404);
  }
  
  return integrationLog;
};

/**
 * Get integration logs by integration ID
 *
 * @param {string} integrationId - Integration ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated integration logs
 */
const getIntegrationLogsByIntegrationId = async (integrationId, page = 1, limit = 20, sortBy = 'logged_at', order = 'desc') => {
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };
  
  const where = {
    integration_id: integrationId
  };
  
  const [integrationLogs, total] = await Promise.all([
    integrationLogRepository.findMany(where, skip, limit, orderBy, { integration: true }),
    integrationLogRepository.count(where)
  ]);
  
  return {
    data: integrationLogs,
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
 * List integration logs with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated integration logs
 */
const listIntegrationLogs = async (filters = {}, page = 1, limit = 20, sortBy = 'logged_at', order = 'desc') => {
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };
  
  // Build filter object
  const where = {};
  
  if (filters.integration_id) {
    where.integration_id = filters.integration_id;
  }
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.search) {
    where.OR = [
      { message: { contains: filters.search } }
    ];
  }
  
  const [integrationLogs, total] = await Promise.all([
    integrationLogRepository.findMany(where, skip, limit, orderBy, { integration: true }),
    integrationLogRepository.count(where)
  ]);
  
  return {
    data: integrationLogs,
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

module.exports = {
  getIntegrationLogById,
  getIntegrationLogsByIntegrationId,
  listIntegrationLogs
};
