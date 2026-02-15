/**
 * Imaging asset service
 *
 * @module modules/imaging-asset/services
 * @description Business logic layer for imaging asset operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const imagingAssetRepository = require('../repositories/imaging-asset.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List imaging assets with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Imaging assets and pagination data
 */
const listImagingAssets = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.imaging_study_id) whereClause.imaging_study_id = filters.imaging_study_id;
    if (filters.content_type) whereClause.content_type = { contains: filters.content_type };

    const [imagingAssets, total] = await Promise.all([
      imagingAssetRepository.findMany(whereClause, skip, limit, orderBy),
      imagingAssetRepository.count(whereClause)
    ]);

    return {
      imagingAssets,
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
 * Get imaging asset by ID
 *
 * @param {string} id - Imaging asset ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Imaging asset data
 */
const getImagingAssetById = async (id, userId, ipAddress) => {
  try {
    const imagingAsset = await imagingAssetRepository.findById(id);

    if (!imagingAsset) {
      throw new HttpError('errors.imaging_asset.not_found', 404);
    }

    return imagingAsset;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new imaging asset
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Imaging asset data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created imaging asset
 */
const createImagingAsset = async (data, userId, ipAddress) => {
  try {
    const imagingAsset = await imagingAssetRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'imaging_asset',
      entity_id: imagingAsset.id,
      diff: { after: imagingAsset },
      ip_address: ipAddress
    }).catch(() => {});

    return imagingAsset;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update imaging asset
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Imaging asset ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated imaging asset
 */
const updateImagingAsset = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await imagingAssetRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.imaging_asset.not_found', 404);
    }

    const imagingAsset = await imagingAssetRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'imaging_asset',
      entity_id: imagingAsset.id,
      diff: { before, after: imagingAsset },
      ip_address: ipAddress
    }).catch(() => {});

    return imagingAsset;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete imaging asset (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Imaging asset ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteImagingAsset = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await imagingAssetRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.imaging_asset.not_found', 404);
    }

    await imagingAssetRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'imaging_asset',
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
  listImagingAssets,
  getImagingAssetById,
  createImagingAsset,
  updateImagingAsset,
  deleteImagingAsset
};
