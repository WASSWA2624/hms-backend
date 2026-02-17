/**
 * Appointment service
 *
 * @module modules/appointment/services
 * @description Business logic layer for appointment operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const appointmentRepository = require('@repositories/appointment/appointment.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List appointments with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Appointments and pagination data
 */
const listAppointments = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.patient_id) whereClause.patient_id = filters.patient_id;
    if (filters.provider_user_id) whereClause.provider_user_id = filters.provider_user_id;
    if (filters.status) whereClause.status = filters.status;
    
    // Search filter (searches in reason)
    if (filters.search) {
      whereClause.reason = { contains: filters.search };
    }

    const [appointments, total] = await Promise.all([
      appointmentRepository.findMany(whereClause, skip, limit, orderBy),
      appointmentRepository.count(whereClause)
    ]);

    return {
      appointments,
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
 * Get appointment by ID
 *
 * @param {string} id - Appointment ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Appointment data
 */
const getAppointmentById = async (id, userId, ipAddress) => {
  try {
    const appointment = await appointmentRepository.findById(id);

    if (!appointment) {
      throw new HttpError('errors.appointment.not_found', 404);
    }

    return appointment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new appointment
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Appointment data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created appointment
 */
const createAppointment = async (data, userId, ipAddress) => {
  try {
    const appointment = await appointmentRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'appointment',
      entity_id: appointment.id,
      diff: { after: appointment },
      ip_address: ipAddress
    }).catch(() => {});

    return appointment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update appointment
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Appointment ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated appointment
 */
const updateAppointment = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await appointmentRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.appointment.not_found', 404);
    }

    const appointment = await appointmentRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'appointment',
      entity_id: appointment.id,
      diff: { before, after: appointment },
      ip_address: ipAddress
    }).catch(() => {});

    return appointment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete appointment (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Appointment ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteAppointment = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await appointmentRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.appointment.not_found', 404);
    }

    await appointmentRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'appointment',
      entity_id: id,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Cancel appointment (action endpoint)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Appointment ID
 * @param {string} reason - Cancellation reason (optional)
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Cancelled appointment
 */
const cancelAppointment = async (id, reason, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await appointmentRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.appointment.not_found', 404);
    }

    // Check if already cancelled
    if (before.status === 'CANCELLED') {
      throw new HttpError('errors.appointment.already_cancelled', 400);
    }

    // Update to cancelled status
    const updateData = {
      status: 'CANCELLED'
    };

    // Optionally append cancellation reason to existing reason
    if (reason) {
      updateData.reason = before.reason 
        ? `${before.reason}\nCancellation reason: ${reason}`
        : `Cancellation reason: ${reason}`;
    }

    const appointment = await appointmentRepository.update(id, updateData);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CANCEL',
      entity: 'appointment',
      entity_id: appointment.id,
      diff: { before, after: appointment },
      ip_address: ipAddress
    }).catch(() => {});

    return appointment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  cancelAppointment
};
