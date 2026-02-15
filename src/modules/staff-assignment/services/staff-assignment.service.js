/**
 * Staff assignment service
 *
 * @module modules/staff-assignment/services
 * @description Business logic layer for staff assignment operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const staffAssignmentRepository = require('../repositories/staff-assignment.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List staff assignments with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Staff assignments and pagination data
 */
const listStaffAssignments = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.staff_profile_id) whereClause.staff_profile_id = filters.staff_profile_id;
    if (filters.department_id) whereClause.department_id = filters.department_id;
    if (filters.unit_id) whereClause.unit_id = filters.unit_id;

    const [staffAssignments, total] = await Promise.all([
      staffAssignmentRepository.findMany(whereClause, skip, limit, orderBy),
      staffAssignmentRepository.count(whereClause)
    ]);

    return {
      staffAssignments,
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
 * Get staff assignment by ID
 *
 * @param {string} id - Staff assignment ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Staff assignment data
 */
const getStaffAssignmentById = async (id, userId, ipAddress) => {
  try {
    const staffAssignment = await staffAssignmentRepository.findById(id);

    if (!staffAssignment) {
      throw new HttpError('errors.staff_assignment.not_found', 404);
    }

    return staffAssignment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new staff assignment
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Staff assignment data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created staff assignment
 */
const createStaffAssignment = async (data, userId, ipAddress) => {
  try {
    const staffAssignment = await staffAssignmentRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'staff_assignment',
      entity_id: staffAssignment.id,
      diff: { after: staffAssignment },
      ip_address: ipAddress
    }).catch(() => {});

    return staffAssignment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update staff assignment
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Staff assignment ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated staff assignment
 */
const updateStaffAssignment = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await staffAssignmentRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.staff_assignment.not_found', 404);
    }

    const staffAssignment = await staffAssignmentRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'staff_assignment',
      entity_id: staffAssignment.id,
      diff: { before, after: staffAssignment },
      ip_address: ipAddress
    }).catch(() => {});

    return staffAssignment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete staff assignment (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Staff assignment ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteStaffAssignment = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await staffAssignmentRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.staff_assignment.not_found', 404);
    }

    await staffAssignmentRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'staff_assignment',
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
  listStaffAssignments,
  getStaffAssignmentById,
  createStaffAssignment,
  updateStaffAssignment,
  deleteStaffAssignment
};
