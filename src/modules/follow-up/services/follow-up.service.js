/**
 * Follow-up service
 *
 * @module modules/follow-up/services
 * @description Business logic layer for follow-up operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const followUpRepository = require('../repositories/follow-up.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List follow-ups with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Follow-ups and pagination data
 */
const listFollowUps = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.encounter_id) whereClause.encounter_id = filters.encounter_id;

    const [followUps, total] = await Promise.all([
      followUpRepository.findMany(whereClause, skip, limit, orderBy),
      followUpRepository.count(whereClause)
    ]);

    return {
      followUps,
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
 * Get follow-up by ID
 *
 * @param {string} id - Follow-up ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Follow-up data
 */
const getFollowUpById = async (id, userId, ipAddress) => {
  try {
    const followUp = await followUpRepository.findById(id);

    if (!followUp) {
      throw new HttpError('errors.follow_up.not_found', 404);
    }

    return followUp;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new follow-up
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Follow-up data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created follow-up
 */
const createFollowUp = async (data, userId, ipAddress) => {
  try {
    const followUp = await followUpRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'follow_up',
      entity_id: followUp.id,
      diff: { after: followUp },
      ip_address: ipAddress
    }).catch(() => {});

    return followUp;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update follow-up
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Follow-up ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated follow-up
 */
const updateFollowUp = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await followUpRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.follow_up.not_found', 404);
    }

    const followUp = await followUpRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'follow_up',
      entity_id: followUp.id,
      diff: { before, after: followUp },
      ip_address: ipAddress
    }).catch(() => {});

    return followUp;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete follow-up (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Follow-up ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteFollowUp = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await followUpRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.follow_up.not_found', 404);
    }

    await followUpRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'follow_up',
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
  listFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp
};
