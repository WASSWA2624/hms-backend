/**
 * Radiology Result service
 *
 * @module modules/radiology-result/services
 * @description Business logic layer for radiology result operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const radiologyResultRepository = require('@repositories/radiology-result/radiology-result.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const { resolveModelIdByIdentifier } = require('@lib/identifiers/resolve-entity-id');

const resolveForeignId = async (model, identifier) => {
  if (identifier == null || identifier === '') return null;
  const resolved = await resolveModelIdByIdentifier({
    model,
    identifier,
    where: { deleted_at: null },
  });
  if (!resolved) {
    throw new HttpError('errors.resource.not_found', 404);
  }
  return resolved;
};

/**
 * List radiology results with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Radiology results and pagination data
 */
const listRadiologyResults = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.radiology_order_id) {
      whereClause.radiology_order_id = await resolveForeignId(
        'radiology_order',
        filters.radiology_order_id
      );
    }
    if (filters.status) whereClause.status = filters.status;
    
    // Search filter (searches in report_text)
    if (filters.search) {
      whereClause.report_text = { contains: filters.search };
    }

    const [radiologyResults, total] = await Promise.all([
      radiologyResultRepository.findMany(whereClause, skip, limit, orderBy),
      radiologyResultRepository.count(whereClause)
    ]);

    return {
      radiology_results: radiologyResults,
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
 * Get radiology result by ID
 *
 * @param {string} id - Radiology Result ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Radiology result data
 */
const getRadiologyResultById = async (id, userId, ipAddress) => {
  try {
    const radiologyResult = await radiologyResultRepository.findById(id);

    if (!radiologyResult) {
      throw new HttpError('errors.radiology_result.not_found', 404);
    }

    return radiologyResult;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new radiology result
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Radiology Result data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created radiology result
 */
const createRadiologyResult = async (data, userId, ipAddress) => {
  try {
    const normalizedData = {
      ...data,
      radiology_order_id: await resolveForeignId('radiology_order', data.radiology_order_id),
    };

    const radiologyResult = await radiologyResultRepository.create(normalizedData);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'radiology_result',
      entity_id: radiologyResult.id,
      diff: { after: radiologyResult },
      ip_address: ipAddress
    }).catch(() => {});

    return radiologyResult;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update radiology result
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Radiology Result ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated radiology result
 */
const updateRadiologyResult = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await radiologyResultRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.radiology_result.not_found', 404);
    }

    const normalizedData = {
      ...data,
    };
    if (Object.prototype.hasOwnProperty.call(data, 'radiology_order_id')) {
      normalizedData.radiology_order_id = await resolveForeignId(
        'radiology_order',
        data.radiology_order_id
      );
    }

    const radiologyResult = await radiologyResultRepository.update(id, normalizedData);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'radiology_result',
      entity_id: radiologyResult.id,
      diff: { before, after: radiologyResult },
      ip_address: ipAddress
    }).catch(() => {});

    return radiologyResult;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete radiology result (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Radiology Result ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteRadiologyResult = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await radiologyResultRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.radiology_result.not_found', 404);
    }

    await radiologyResultRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'radiology_result',
      entity_id: id,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Sign off radiology result
 *
 * @param {string} id - Radiology Result ID
 * @param {Object} data - Sign-off payload
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated radiology result
 */
const signOffRadiologyResult = async (id, data = {}, userId, ipAddress) => {
  try {
    const before = await radiologyResultRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.radiology_result.not_found', 404);
    }

    if (before.status === 'FINAL') {
      throw new HttpError('errors.radiology_result.already_signed_off', 400);
    }

    const updateData = {
      status: 'FINAL',
      reported_at: data.reported_at ? new Date(data.reported_at) : new Date()
    };

    const radiologyResult = await radiologyResultRepository.update(id, updateData);

    createAuditLog({
      user_id: userId,
      action: 'SIGN_OFF',
      entity: 'radiology_result',
      entity_id: radiologyResult.id,
      diff: {
        before,
        after: radiologyResult,
        metadata: {
          notes: data.notes || null
        }
      },
      ip_address: ipAddress
    }).catch(() => {});

    return radiologyResult;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listRadiologyResults,
  getRadiologyResultById,
  createRadiologyResult,
  updateRadiologyResult,
  deleteRadiologyResult,
  signOffRadiologyResult
};
