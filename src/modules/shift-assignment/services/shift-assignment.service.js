/**
 * Shift assignment service
 *
 * @module modules/shift-assignment/services
 * @description Business logic layer for shift assignment operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const shiftAssignmentRepository = require('../repositories/shift-assignment.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List shift assignments with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Shift assignments and pagination data
 */
const listShiftAssignments = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.shift_id) whereClause.shift_id = filters.shift_id;
    if (filters.staff_profile_id) whereClause.staff_profile_id = filters.staff_profile_id;
    
    // Date range filters
    if (filters.assigned_at_from || filters.assigned_at_to) {
      whereClause.assigned_at = {};
      if (filters.assigned_at_from) whereClause.assigned_at.gte = new Date(filters.assigned_at_from);
      if (filters.assigned_at_to) whereClause.assigned_at.lte = new Date(filters.assigned_at_to);
    }

    const [shiftAssignments, total] = await Promise.all([
      shiftAssignmentRepository.findMany(whereClause, skip, limit, orderBy),
      shiftAssignmentRepository.count(whereClause)
    ]);

    return {
      shiftAssignments,
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
 * Get shift assignment by ID
 *
 * @param {string} id - Shift assignment ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Shift assignment data
 */
const getShiftAssignmentById = async (id, userId, ipAddress) => {
  try {
    const shiftAssignment = await shiftAssignmentRepository.findById(id);

    if (!shiftAssignment) {
      throw new HttpError('errors.shift_assignment.not_found', 404);
    }

    return shiftAssignment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new shift assignment
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Shift assignment data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created shift assignment
 */
const createShiftAssignment = async (data, userId, ipAddress) => {
  try {
    const shiftAssignment = await shiftAssignmentRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'shift_assignment',
      entity_id: shiftAssignment.id,
      diff: { after: shiftAssignment },
      ip_address: ipAddress
    }).catch(() => {});

    return shiftAssignment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update shift assignment
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Shift assignment ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated shift assignment
 */
const updateShiftAssignment = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await shiftAssignmentRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.shift_assignment.not_found', 404);
    }

    const shiftAssignment = await shiftAssignmentRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'shift_assignment',
      entity_id: shiftAssignment.id,
      diff: { before, after: shiftAssignment },
      ip_address: ipAddress
    }).catch(() => {});

    return shiftAssignment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete shift assignment (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Shift assignment ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteShiftAssignment = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await shiftAssignmentRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.shift_assignment.not_found', 404);
    }

    await shiftAssignmentRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'shift_assignment',
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
  listShiftAssignments,
  getShiftAssignmentById,
  createShiftAssignment,
  updateShiftAssignment,
  deleteShiftAssignment
};
