/**
 * Coverage Plan service
 *
 * @module modules/coverage-plan/services
 * @description Business logic layer for coverage plan operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const coveragePlanRepository = require('../repositories/coverage-plan.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List coverage plans with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Coverage plans and pagination data
 */
const listCoveragePlans = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.provider_name) whereClause.provider_name = { contains: filters.provider_name };
    if (filters.name) whereClause.name = { contains: filters.name };
    
    // Search filter (searches in name, provider_name)
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search } },
        { provider_name: { contains: filters.search } }
      ];
    }

    const [coveragePlans, total] = await Promise.all([
      coveragePlanRepository.findMany(whereClause, skip, limit, orderBy),
      coveragePlanRepository.count(whereClause)
    ]);

    return {
      coveragePlans,
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
 * Get coverage plan by ID
 *
 * @param {string} id - Coverage Plan ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Coverage plan data
 */
const getCoveragePlanById = async (id, userId, ipAddress) => {
  try {
    const coveragePlan = await coveragePlanRepository.findById(id);

    if (!coveragePlan) {
      throw new HttpError('errors.coverage_plan.not_found', 404);
    }

    return coveragePlan;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new coverage plan
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Coverage Plan data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created coverage plan
 */
const createCoveragePlan = async (data, userId, ipAddress) => {
  try {
    const coveragePlan = await coveragePlanRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'coverage_plan',
      entity_id: coveragePlan.id,
      diff: { after: coveragePlan },
      ip_address: ipAddress
    }).catch(() => {});

    return coveragePlan;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update coverage plan
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Coverage Plan ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated coverage plan
 */
const updateCoveragePlan = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await coveragePlanRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.coverage_plan.not_found', 404);
    }

    const coveragePlan = await coveragePlanRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'coverage_plan',
      entity_id: coveragePlan.id,
      diff: { before, after: coveragePlan },
      ip_address: ipAddress
    }).catch(() => {});

    return coveragePlan;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete coverage plan (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Coverage Plan ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteCoveragePlan = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await coveragePlanRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.coverage_plan.not_found', 404);
    }

    await coveragePlanRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'coverage_plan',
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
  listCoveragePlans,
  getCoveragePlanById,
  createCoveragePlan,
  updateCoveragePlan,
  deleteCoveragePlan
};
