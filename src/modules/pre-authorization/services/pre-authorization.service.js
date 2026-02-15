/**
 * Pre-authorization service
 *
 * @module modules/pre-authorization/services
 * @description Business logic layer for pre-authorization operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const preAuthorizationRepository = require('../repositories/pre-authorization.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List pre-authorizations with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Pre-authorizations and pagination data
 */
const listPreAuthorizations = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.coverage_plan_id) whereClause.coverage_plan_id = filters.coverage_plan_id;
    if (filters.status) whereClause.status = filters.status;
    
    // Date range filters for requested_at
    if (filters.requested_at_from || filters.requested_at_to) {
      whereClause.requested_at = {};
      if (filters.requested_at_from) whereClause.requested_at.gte = new Date(filters.requested_at_from);
      if (filters.requested_at_to) whereClause.requested_at.lte = new Date(filters.requested_at_to);
    }
    
    // Date range filters for approved_at
    if (filters.approved_at_from || filters.approved_at_to) {
      whereClause.approved_at = {};
      if (filters.approved_at_from) whereClause.approved_at.gte = new Date(filters.approved_at_from);
      if (filters.approved_at_to) whereClause.approved_at.lte = new Date(filters.approved_at_to);
    }

    const [preAuthorizations, total] = await Promise.all([
      preAuthorizationRepository.findMany(whereClause, skip, limit, orderBy),
      preAuthorizationRepository.count(whereClause)
    ]);

    return {
      pre_authorizations: preAuthorizations,
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
 * Get pre-authorization by ID
 *
 * @param {string} id - Pre-authorization ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Pre-authorization data
 */
const getPreAuthorizationById = async (id, userId, ipAddress) => {
  try {
    const preAuthorization = await preAuthorizationRepository.findById(id);

    if (!preAuthorization) {
      throw new HttpError('errors.pre_authorization.not_found', 404);
    }

    return preAuthorization;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new pre-authorization
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Pre-authorization data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created pre-authorization
 */
const createPreAuthorization = async (data, userId, ipAddress) => {
  try {
    const preAuthorization = await preAuthorizationRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'pre_authorization',
      entity_id: preAuthorization.id,
      diff: { after: preAuthorization },
      ip_address: ipAddress
    }).catch(() => {});

    return preAuthorization;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update pre-authorization
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Pre-authorization ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated pre-authorization
 */
const updatePreAuthorization = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await preAuthorizationRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.pre_authorization.not_found', 404);
    }

    const preAuthorization = await preAuthorizationRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'pre_authorization',
      entity_id: preAuthorization.id,
      diff: { before, after: preAuthorization },
      ip_address: ipAddress
    }).catch(() => {});

    return preAuthorization;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete pre-authorization (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Pre-authorization ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deletePreAuthorization = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await preAuthorizationRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.pre_authorization.not_found', 404);
    }

    await preAuthorizationRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'pre_authorization',
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
  listPreAuthorizations,
  getPreAuthorizationById,
  createPreAuthorization,
  updatePreAuthorization,
  deletePreAuthorization
};
