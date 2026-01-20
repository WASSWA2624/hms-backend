/**
 * Referral service
 *
 * @module modules/referral/services
 * @description Business logic layer for referral operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const referralRepository = require('@repositories/referral/referral.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List referrals with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Referrals and pagination data
 */
const listReferrals = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.encounter_id) whereClause.encounter_id = filters.encounter_id;
    if (filters.from_department_id) whereClause.from_department_id = filters.from_department_id;
    if (filters.to_department_id) whereClause.to_department_id = filters.to_department_id;
    if (filters.status) whereClause.status = filters.status;

    const [referrals, total] = await Promise.all([
      referralRepository.findMany(whereClause, skip, limit, orderBy),
      referralRepository.count(whereClause)
    ]);

    return {
      referrals,
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
 * Get referral by ID
 *
 * @param {string} id - Referral ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Referral data
 */
const getReferralById = async (id, userId, ipAddress) => {
  try {
    const referral = await referralRepository.findById(id);

    if (!referral) {
      throw new HttpError('errors.referral.not_found', 404);
    }

    return referral;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new referral
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Referral data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created referral
 */
const createReferral = async (data, userId, ipAddress) => {
  try {
    const referral = await referralRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'referral',
      entity_id: referral.id,
      diff: { after: referral },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return referral;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update referral
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Referral ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated referral
 */
const updateReferral = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await referralRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.referral.not_found', 404);
    }

    const referral = await referralRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'referral',
      entity_id: referral.id,
      diff: { before, after: referral },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return referral;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete referral (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Referral ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteReferral = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await referralRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.referral.not_found', 404);
    }

    await referralRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'referral',
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
  listReferrals,
  getReferralById,
  createReferral,
  updateReferral,
  deleteReferral
};
