/**
 * Availability slot service
 *
 * @module modules/availability-slot/services
 * @description Business logic layer for availability slot operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const availabilitySlotRepository = require('../repositories/availability-slot.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List availability slots with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Availability slots and pagination data
 */
const listAvailabilitySlots = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.schedule_id) whereClause.schedule_id = filters.schedule_id;
    if (filters.is_available !== undefined) whereClause.is_available = filters.is_available;

    const [slots, total] = await Promise.all([
      availabilitySlotRepository.findMany(whereClause, skip, limit, orderBy),
      availabilitySlotRepository.count(whereClause)
    ]);

    return {
      slots,
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
 * Get availability slot by ID
 *
 * @param {string} id - Availability slot ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Availability slot data
 */
const getAvailabilitySlotById = async (id, userId, ipAddress) => {
  try {
    const slot = await availabilitySlotRepository.findById(id);

    if (!slot) {
      throw new HttpError('errors.availability_slot.not_found', 404);
    }

    return slot;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new availability slot
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Availability slot data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created availability slot
 */
const createAvailabilitySlot = async (data, userId, ipAddress) => {
  try {
    const slot = await availabilitySlotRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'availability_slot',
      entity_id: slot.id,
      diff: { after: slot },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return slot;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update availability slot
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Availability slot ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated availability slot
 */
const updateAvailabilitySlot = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await availabilitySlotRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.availability_slot.not_found', 404);
    }

    const slot = await availabilitySlotRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'availability_slot',
      entity_id: slot.id,
      diff: { before, after: slot },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return slot;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete availability slot (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Availability slot ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteAvailabilitySlot = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await availabilitySlotRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.availability_slot.not_found', 404);
    }

    await availabilitySlotRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'availability_slot',
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
  listAvailabilitySlots,
  getAvailabilitySlotById,
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot
};
