/**
 * Staff leave service
 *
 * @module modules/staff-leave/services
 * @description Business logic layer for staff leave operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const staffLeaveRepository = require('../repositories/staff-leave.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List staff leaves with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Staff leaves and pagination data
 */
const listStaffLeaves = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.staff_profile_id) whereClause.staff_profile_id = filters.staff_profile_id;
    if (filters.status) whereClause.status = filters.status;

    const [staffLeaves, total] = await Promise.all([
      staffLeaveRepository.findMany(whereClause, skip, limit, orderBy),
      staffLeaveRepository.count(whereClause)
    ]);

    return {
      staffLeaves,
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
 * Get staff leave by ID
 *
 * @param {string} id - Staff leave ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Staff leave data
 */
const getStaffLeaveById = async (id, userId, ipAddress) => {
  try {
    const staffLeave = await staffLeaveRepository.findById(id);

    if (!staffLeave) {
      throw new HttpError('errors.staff_leave.not_found', 404);
    }

    return staffLeave;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new staff leave
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Staff leave data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created staff leave
 */
const createStaffLeave = async (data, userId, ipAddress) => {
  try {
    const staffLeave = await staffLeaveRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'staff_leave',
      entity_id: staffLeave.id,
      diff: { after: staffLeave },
      ip_address: ipAddress
    }).catch(() => {});

    return staffLeave;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update staff leave
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Staff leave ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated staff leave
 */
const updateStaffLeave = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await staffLeaveRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.staff_leave.not_found', 404);
    }

    const staffLeave = await staffLeaveRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'staff_leave',
      entity_id: staffLeave.id,
      diff: { before, after: staffLeave },
      ip_address: ipAddress
    }).catch(() => {});

    return staffLeave;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete staff leave (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Staff leave ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteStaffLeave = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await staffLeaveRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.staff_leave.not_found', 404);
    }

    await staffLeaveRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'staff_leave',
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
  listStaffLeaves,
  getStaffLeaveById,
  createStaffLeave,
  updateStaffLeave,
  deleteStaffLeave
};
