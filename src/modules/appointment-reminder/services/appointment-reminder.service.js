/**
 * Appointment reminder service
 *
 * @module modules/appointment-reminder/services
 * @description Business logic layer for appointment reminder operations.
 */

const appointmentReminderRepository = require('../repositories/appointment-reminder.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const listAppointmentReminders = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};
    
    if (filters.appointment_id) whereClause.appointment_id = filters.appointment_id;
    if (filters.channel) whereClause.channel = filters.channel;

    const [reminders, total] = await Promise.all([
      appointmentReminderRepository.findMany(whereClause, skip, limit, orderBy),
      appointmentReminderRepository.count(whereClause)
    ]);

    return {
      reminders,
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

const getAppointmentReminderById = async (id, userId, ipAddress) => {
  try {
    const reminder = await appointmentReminderRepository.findById(id);

    if (!reminder) {
      throw new HttpError('errors.appointment_reminder.not_found', 404);
    }

    return reminder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const createAppointmentReminder = async (data, userId, ipAddress) => {
  try {
    const reminder = await appointmentReminderRepository.create(data);

    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'appointment_reminder',
      entity_id: reminder.id,
      diff: { after: reminder },
      ip_address: ipAddress
    }).catch(() => {});

    return reminder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const updateAppointmentReminder = async (id, data, userId, ipAddress) => {
  try {
    const before = await appointmentReminderRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.appointment_reminder.not_found', 404);
    }

    const reminder = await appointmentReminderRepository.update(id, data);

    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'appointment_reminder',
      entity_id: reminder.id,
      diff: { before, after: reminder },
      ip_address: ipAddress
    }).catch(() => {});

    return reminder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const deleteAppointmentReminder = async (id, userId, ipAddress) => {
  try {
    const before = await appointmentReminderRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.appointment_reminder.not_found', 404);
    }

    await appointmentReminderRepository.softDelete(id);

    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'appointment_reminder',
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
  listAppointmentReminders,
  getAppointmentReminderById,
  createAppointmentReminder,
  updateAppointmentReminder,
  deleteAppointmentReminder
};
