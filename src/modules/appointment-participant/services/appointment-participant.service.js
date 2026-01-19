/**
 * Appointment participant service
 *
 * @module modules/appointment-participant/services
 * @description Business logic layer for appointment participant operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const appointmentParticipantRepository = require('../repositories/appointment-participant.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List appointment participants with pagination and filtering
 */
const listAppointmentParticipants = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};
    
    if (filters.appointment_id) whereClause.appointment_id = filters.appointment_id;
    if (filters.participant_user_id) whereClause.participant_user_id = filters.participant_user_id;
    if (filters.participant_patient_id) whereClause.participant_patient_id = filters.participant_patient_id;
    if (filters.role) whereClause.role = { contains: filters.role };

    const [participants, total] = await Promise.all([
      appointmentParticipantRepository.findMany(whereClause, skip, limit, orderBy),
      appointmentParticipantRepository.count(whereClause)
    ]);

    return {
      participants,
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
 * Get appointment participant by ID
 */
const getAppointmentParticipantById = async (id, userId, ipAddress) => {
  try {
    const participant = await appointmentParticipantRepository.findById(id);

    if (!participant) {
      throw new HttpError('errors.appointment_participant.not_found', 404);
    }

    return participant;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new appointment participant
 */
const createAppointmentParticipant = async (data, userId, ipAddress) => {
  try {
    const participant = await appointmentParticipantRepository.create(data);

    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'appointment_participant',
      entity_id: participant.id,
      diff: { after: participant },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return participant;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update appointment participant
 */
const updateAppointmentParticipant = async (id, data, userId, ipAddress) => {
  try {
    const before = await appointmentParticipantRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.appointment_participant.not_found', 404);
    }

    const participant = await appointmentParticipantRepository.update(id, data);

    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'appointment_participant',
      entity_id: participant.id,
      diff: { before, after: participant },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return participant;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete appointment participant (soft delete)
 */
const deleteAppointmentParticipant = async (id, userId, ipAddress) => {
  try {
    const before = await appointmentParticipantRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.appointment_participant.not_found', 404);
    }

    await appointmentParticipantRepository.softDelete(id);

    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'appointment_participant',
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
  listAppointmentParticipants,
  getAppointmentParticipantById,
  createAppointmentParticipant,
  updateAppointmentParticipant,
  deleteAppointmentParticipant
};
