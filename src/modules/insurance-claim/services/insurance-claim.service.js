/**
 * Insurance claim service
 *
 * @module modules/insurance-claim/services
 * @description Business logic layer for insurance claim operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const insuranceClaimRepository = require('@repositories/insurance-claim/insurance-claim.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List insurance claims with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Insurance claims and pagination data
 */
const listInsuranceClaims = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.coverage_plan_id) whereClause.coverage_plan_id = filters.coverage_plan_id;
    if (filters.invoice_id) whereClause.invoice_id = filters.invoice_id;
    if (filters.status) whereClause.status = filters.status;
    
    // Date range filters
    if (filters.submitted_at_from || filters.submitted_at_to) {
      whereClause.submitted_at = {};
      if (filters.submitted_at_from) whereClause.submitted_at.gte = new Date(filters.submitted_at_from);
      if (filters.submitted_at_to) whereClause.submitted_at.lte = new Date(filters.submitted_at_to);
    }

    const [insuranceClaims, total] = await Promise.all([
      insuranceClaimRepository.findMany(whereClause, skip, limit, orderBy),
      insuranceClaimRepository.count(whereClause)
    ]);

    return {
      insurance_claims: insuranceClaims,
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
 * Get insurance claim by ID
 *
 * @param {string} id - Insurance claim ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Insurance claim data
 */
const getInsuranceClaimById = async (id, userId, ipAddress) => {
  try {
    const insuranceClaim = await insuranceClaimRepository.findById(id);

    if (!insuranceClaim) {
      throw new HttpError('errors.insurance_claim.not_found', 404);
    }

    return insuranceClaim;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new insurance claim
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Insurance claim data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created insurance claim
 */
const createInsuranceClaim = async (data, userId, ipAddress) => {
  try {
    const insuranceClaim = await insuranceClaimRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'insurance_claim',
      entity_id: insuranceClaim.id,
      diff: { after: insuranceClaim },
      ip_address: ipAddress
    }).catch(() => {});

    return insuranceClaim;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update insurance claim
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Insurance claim ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated insurance claim
 */
const updateInsuranceClaim = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await insuranceClaimRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.insurance_claim.not_found', 404);
    }

    const insuranceClaim = await insuranceClaimRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'insurance_claim',
      entity_id: insuranceClaim.id,
      diff: { before, after: insuranceClaim },
      ip_address: ipAddress
    }).catch(() => {});

    return insuranceClaim;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete insurance claim (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Insurance claim ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteInsuranceClaim = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await insuranceClaimRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.insurance_claim.not_found', 404);
    }

    await insuranceClaimRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'insurance_claim',
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
  listInsuranceClaims,
  getInsuranceClaimById,
  createInsuranceClaim,
  updateInsuranceClaim,
  deleteInsuranceClaim
};
