/**
 * Asset service log service
 *
 * @module modules/asset-service-log/services
 * @description Business logic layer for asset service log operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const assetServiceLogRepository = require('../repositories/asset-service-log.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List asset service logs with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Asset service logs and pagination data
 */
const listAssetServiceLogs = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.asset_id) whereClause.asset_id = filters.asset_id;
    
    // Search filter (searches in notes)
    if (filters.search) {
      whereClause.OR = [
        { notes: { contains: filters.search } }
      ];
    }

    const [assetServiceLogs, total] = await Promise.all([
      assetServiceLogRepository.findMany(whereClause, skip, limit, orderBy),
      assetServiceLogRepository.count(whereClause)
    ]);

    return {
      assetServiceLogs,
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
 * Get asset service log by ID
 *
 * @param {string} id - Asset service log ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Asset service log data
 */
const getAssetServiceLogById = async (id, userId, ipAddress) => {
  try {
    const assetServiceLog = await assetServiceLogRepository.findById(id);

    if (!assetServiceLog) {
      throw new HttpError('errors.asset_service_log.not_found', 404);
    }

    return assetServiceLog;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new asset service log
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Asset service log data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created asset service log
 */
const createAssetServiceLog = async (data, userId, ipAddress) => {
  try {
    // Convert datetime strings to Date objects
    const processedData = { ...data };
    if (processedData.serviced_at) {
      processedData.serviced_at = new Date(processedData.serviced_at);
    }

    const assetServiceLog = await assetServiceLogRepository.create(processedData);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'asset_service_log',
      entity_id: assetServiceLog.id,
      diff: { after: assetServiceLog },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return assetServiceLog;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update asset service log
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Asset service log ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated asset service log
 */
const updateAssetServiceLog = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await assetServiceLogRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.asset_service_log.not_found', 404);
    }

    // Convert datetime strings to Date objects
    const processedData = { ...data };
    if (processedData.serviced_at) {
      processedData.serviced_at = new Date(processedData.serviced_at);
    }

    const assetServiceLog = await assetServiceLogRepository.update(id, processedData);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'asset_service_log',
      entity_id: assetServiceLog.id,
      diff: { before, after: assetServiceLog },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return assetServiceLog;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete asset service log (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Asset service log ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteAssetServiceLog = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await assetServiceLogRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.asset_service_log.not_found', 404);
    }

    await assetServiceLogRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'asset_service_log',
      entity_id: id,
      diff: { before },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listAssetServiceLogs,
  getAssetServiceLogById,
  createAssetServiceLog,
  updateAssetServiceLog,
  deleteAssetServiceLog
};
