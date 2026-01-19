/**
 * Shift service
 *
 * @module modules/shift/services
 * @description Business logic layer for shift operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const shiftRepository = require('../repositories/shift.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List shifts with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Shifts and pagination data
 */
const listShifts = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.shift_type) whereClause.shift_type = filters.shift_type;
    if (filters.status) whereClause.status = filters.status;
    
    // Date range filters
    if (filters.start_time_from || filters.start_time_to) {
      whereClause.start_time = {};
      if (filters.start_time_from) whereClause.start_time.gte = new Date(filters.start_time_from);
      if (filters.start_time_to) whereClause.start_time.lte = new Date(filters.start_time_to);
    }
    
    if (filters.end_time_from || filters.end_time_to) {
      whereClause.end_time = {};
      if (filters.end_time_from) whereClause.end_time.gte = new Date(filters.end_time_from);
      if (filters.end_time_to) whereClause.end_time.lte = new Date(filters.end_time_to);
    }

    const [shifts, total] = await Promise.all([
      shiftRepository.findMany(whereClause, skip, limit, orderBy),
      shiftRepository.count(whereClause)
    ]);

    return {
      shifts,
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
 * Get shift by ID
 *
 * @param {string} id - Shift ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Shift data
 */
const getShiftById = async (id, userId, ipAddress) => {
  try {
    const shift = await shiftRepository.findById(id);

    if (!shift) {
      throw new HttpError('errors.shift.not_found', 404);
    }

    return shift;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new shift
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Shift data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created shift
 */
const createShift = async (data, userId, ipAddress) => {
  try {
    const shift = await shiftRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'shift',
      entity_id: shift.id,
      diff: { after: shift },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return shift;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update shift
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Shift ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated shift
 */
const updateShift = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await shiftRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.shift.not_found', 404);
    }

    const shift = await shiftRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'shift',
      entity_id: shift.id,
      diff: { before, after: shift },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return shift;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete shift (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Shift ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteShift = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await shiftRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.shift.not_found', 404);
    }

    await shiftRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'shift',
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

/**
 * Publish shift
 * Marks shift as published and optionally notifies assigned staff
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Shift ID
 * @param {boolean} notifyStaff - Whether to notify staff
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Published shift
 */
const publishShift = async (id, notifyStaff, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await shiftRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.shift.not_found', 404);
    }

    // Check if shift is already published (status is SCHEDULED means publishable)
    if (before.status === 'COMPLETED' || before.status === 'CANCELLED') {
      throw new HttpError('errors.shift.already_published', 400);
    }

    // Update shift status to indicate it's published
    const shift = await shiftRepository.update(id, { status: 'SCHEDULED' });

    // TODO: If notifyStaff is true, send notifications to assigned staff
    // This would require access to notification service

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'PUBLISH',
      entity: 'shift',
      entity_id: shift.id,
      diff: { before, after: shift, metadata: { notifyStaff } },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return shift;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  publishShift
};
