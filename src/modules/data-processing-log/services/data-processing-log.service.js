/**
 * Data processing log service
 *
 * @module modules/data-processing-log/services
 * @description Business logic layer for data processing log operations.
 * Per module-creation.mdc: Only import/use its own repo (no direct DB).
 * Per module-creation.mdc: All mutations call createAuditLog.
 * Per module-creation.mdc: Use Prisma $transaction() for multi-step mutations.
 */

const dataProcessingLogRepository = require('@modules/data-processing-log/repositories/data-processing-log.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const prisma = require('@prisma/client');

/**
 * Get data processing log by ID
 *
 * @param {string} id - Data processing log ID
 * @returns {Promise<Object>} Data processing log object
 * @throws {HttpError} If data processing log not found
 */
const getDataProcessingLogById = async (id) => {
  const dataProcessingLog = await dataProcessingLogRepository.findById(id, {
    tenant: true,
    user: {
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true
      }
    }
  });

  if (!dataProcessingLog) {
    throw new HttpError('errors.data_processing_log.not_found', 404);
  }

  return dataProcessingLog;
};

/**
 * Get paginated list of data processing logs
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated data processing logs with metadata
 */
const getDataProcessingLogs = async (filters = {}, page = 1, limit = 20, sortBy = 'processed_at', order = 'desc') => {
  // Build filter object
  const where = {};

  if (filters.tenant_id) where.tenant_id = filters.tenant_id;
  if (filters.user_id) where.user_id = filters.user_id;
  if (filters.purpose) where.purpose = filters.purpose;
  if (filters.legal_basis) where.legal_basis = filters.legal_basis;

  // Date range filters
  if (filters.date_from || filters.date_to) {
    where.processed_at = {};
    if (filters.date_from) where.processed_at.gte = new Date(filters.date_from);
    if (filters.date_to) where.processed_at.lte = new Date(filters.date_to);
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };

  // Fetch data
  const [dataProcessingLogs, total] = await Promise.all([
    dataProcessingLogRepository.findMany(where, skip, limit, orderBy, {
      tenant: true,
      user: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true
        }
      }
    }),
    dataProcessingLogRepository.count(where)
  ]);

  return {
    data: dataProcessingLogs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Create new data processing log
 * Per module-creation.mdc: All mutations must create audit logs
 *
 * @param {Object} data - Data processing log data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created data processing log
 */
const createDataProcessingLog = async (data, userId, ipAddress) => {
  return await prisma.$transaction(async (tx) => {
    // Create data processing log
    const dataProcessingLog = await dataProcessingLogRepository.create(data);

    // Create audit log
    await createAuditLog({
      tenant_id: data.tenant_id,
      user_id: userId,
      action: 'CREATE',
      entity: 'data_processing_log',
      entity_id: dataProcessingLog.id,
      ip_address: ipAddress
    });

    return dataProcessingLog;
  });
};

/**
 * Update data processing log
 * Per module-creation.mdc: All mutations must create audit logs
 *
 * @param {string} id - Data processing log ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated data processing log
 */
const updateDataProcessingLog = async (id, data, userId, ipAddress) => {
  // Check if data processing log exists
  const existingLog = await dataProcessingLogRepository.findById(id);
  if (!existingLog) {
    throw new HttpError('errors.data_processing_log.not_found', 404);
  }

  return await prisma.$transaction(async (tx) => {
    // Update data processing log
    const dataProcessingLog = await dataProcessingLogRepository.update(id, data);

    // Create audit log
    await createAuditLog({
      tenant_id: existingLog.tenant_id,
      user_id: userId,
      action: 'UPDATE',
      entity: 'data_processing_log',
      entity_id: id,
      ip_address: ipAddress
    });

    return dataProcessingLog;
  });
};

/**
 * Delete data processing log (soft delete)
 * Per module-creation.mdc: All mutations must create audit logs
 * Per prisma.mdc: Only soft deletes allowed
 *
 * @param {string} id - Data processing log ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Deleted data processing log
 */
const deleteDataProcessingLog = async (id, userId, ipAddress) => {
  // Check if data processing log exists
  const existingLog = await dataProcessingLogRepository.findById(id);
  if (!existingLog) {
    throw new HttpError('errors.data_processing_log.not_found', 404);
  }

  return await prisma.$transaction(async (tx) => {
    // Soft delete data processing log
    const dataProcessingLog = await dataProcessingLogRepository.softDelete(id);

    // Create audit log
    await createAuditLog({
      tenant_id: existingLog.tenant_id,
      user_id: userId,
      action: 'DELETE',
      entity: 'data_processing_log',
      entity_id: id,
      ip_address: ipAddress
    });

    return dataProcessingLog;
  });
};

module.exports = {
  getDataProcessingLogById,
  getDataProcessingLogs,
  createDataProcessingLog,
  updateDataProcessingLog,
  deleteDataProcessingLog
};
