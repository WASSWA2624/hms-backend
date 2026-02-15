/**
 * Asset service
 *
 * @module modules/asset/services
 * @description Business logic layer for asset operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const assetRepository = require('../repositories/asset.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List assets with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Assets and pagination data
 */
const listAssets = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.name) whereClause.name = { contains: filters.name };
    if (filters.asset_tag) whereClause.asset_tag = { contains: filters.asset_tag };
    if (filters.status) whereClause.status = filters.status;
    
    // Search filter (searches in name, asset_tag)
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search } },
        { asset_tag: { contains: filters.search } }
      ];
    }

    const [assets, total] = await Promise.all([
      assetRepository.findMany(whereClause, skip, limit, orderBy),
      assetRepository.count(whereClause)
    ]);

    return {
      assets,
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
 * Get asset by ID
 *
 * @param {string} id - Asset ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Asset data
 */
const getAssetById = async (id, userId, ipAddress) => {
  try {
    const asset = await assetRepository.findById(id);

    if (!asset) {
      throw new HttpError('errors.asset.not_found', 404);
    }

    return asset;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new asset
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Asset data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created asset
 */
const createAsset = async (data, userId, ipAddress) => {
  try {
    const asset = await assetRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'asset',
      entity_id: asset.id,
      diff: { after: asset },
      ip_address: ipAddress
    }).catch(() => {});

    return asset;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update asset
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Asset ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated asset
 */
const updateAsset = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await assetRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.asset.not_found', 404);
    }

    const asset = await assetRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'asset',
      entity_id: asset.id,
      diff: { before, after: asset },
      ip_address: ipAddress
    }).catch(() => {});

    return asset;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete asset (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Asset ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteAsset = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await assetRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.asset.not_found', 404);
    }

    await assetRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'asset',
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
  listAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset
};
