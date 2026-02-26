/**
 * Appointment reminder service
 *
 * @module modules/appointment-reminder/services
 * @description Business logic layer for appointment reminder operations.
 */

const appointmentReminderRepository = require('@repositories/appointment-reminder/appointment-reminder.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const { isUuidLike } = require('@lib/identifiers/sanitize-friendly-ids');
const {
  resolveModelIdByIdentifier,
  resolveModelRecordByIdentifier,
} = require('@lib/identifiers/resolve-entity-id');

const DUE_WINDOW_MS = 24 * 60 * 60 * 1000;

const buildEmptyListResult = (page, limit) => ({
  reminders: [],
  pagination: {
    page,
    limit,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: page > 1,
  },
});

const resolveFilterIdentifier = async ({ value, model, where = {} }) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return undefined;

  const resolvedId = await resolveModelIdByIdentifier({
    model,
    identifier: normalized,
    where,
  });

  if (resolvedId) return resolvedId;
  if (isUuidLike(normalized)) return normalized;
  return null;
};

const resolvePayloadIdentifier = async ({ value, field, model, where = {} }) => {
  if (value === undefined) return undefined;
  if (value === null) {
    throw new HttpError('errors.validation.field.required', 400, [{ field }]);
  }

  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw new HttpError('errors.validation.invalid', 400, [{ field }]);
  }

  const resolvedId = await resolveModelIdByIdentifier({
    model,
    identifier: normalized,
    where,
  });

  if (resolvedId) return resolvedId;
  if (isUuidLike(normalized)) return normalized;

  throw new HttpError('errors.validation.invalid', 400, [{ field }]);
};

const resolveReminderPayloadIdentifiers = async (data = {}) => {
  const payload = { ...data };

  if (payload.appointment_id !== undefined) {
    payload.appointment_id = await resolvePayloadIdentifier({
      value: payload.appointment_id,
      field: 'appointment_id',
      model: 'appointment',
    });
  }

  return payload;
};

const resolveReminderRecordByIdentifier = async (identifier) => {
  const resolved = await resolveModelRecordByIdentifier({
    model: 'appointment_reminder',
    identifier,
    select: { id: true },
  });
  if (!resolved?.id) return null;
  return appointmentReminderRepository.findById(resolved.id);
};

const listAppointmentReminders = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};
    
    const appointmentId = await resolveFilterIdentifier({
      value: filters.appointment_id,
      model: 'appointment',
    });
    if (filters.appointment_id !== undefined && appointmentId === null) {
      return buildEmptyListResult(page, limit);
    }
    if (appointmentId) whereClause.appointment_id = appointmentId;

    if (filters.channel) whereClause.channel = filters.channel;

    const andClauses = [];
    if (filters.is_sent !== undefined) {
      andClauses.push(filters.is_sent ? { sent_at: { not: null } } : { sent_at: null });
    }

    if (filters.due_state) {
      const now = new Date();
      if (filters.due_state === 'OVERDUE') {
        andClauses.push({ sent_at: null });
        andClauses.push({ scheduled_at: { lt: now } });
      }

      if (filters.due_state === 'DUE') {
        andClauses.push({ sent_at: null });
        andClauses.push({
          scheduled_at: {
            gte: now,
            lt: new Date(now.getTime() + DUE_WINDOW_MS),
          },
        });
      }
    }

    if (andClauses.length > 0) {
      whereClause.AND = andClauses;
    }

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
    const reminder = await resolveReminderRecordByIdentifier(id);

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
    const payload = await resolveReminderPayloadIdentifiers(data);
    const reminder = await appointmentReminderRepository.create(payload);

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
    const before = await resolveReminderRecordByIdentifier(id);

    if (!before) {
      throw new HttpError('errors.appointment_reminder.not_found', 404);
    }

    const payload = await resolveReminderPayloadIdentifiers(data);
    const reminder = await appointmentReminderRepository.update(before.id, payload);

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
    const before = await resolveReminderRecordByIdentifier(id);

    if (!before) {
      throw new HttpError('errors.appointment_reminder.not_found', 404);
    }

    await appointmentReminderRepository.softDelete(before.id);

    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'appointment_reminder',
      entity_id: before.id,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const markAppointmentReminderSent = async (id, payload = {}, userId, ipAddress) => {
  try {
    const before = await resolveReminderRecordByIdentifier(id);

    if (!before) {
      throw new HttpError('errors.appointment_reminder.not_found', 404);
    }

    if (before.sent_at) {
      return before;
    }

    const sentAt = payload?.sent_at ? new Date(payload.sent_at) : new Date();
    const reminder = await appointmentReminderRepository.update(before.id, { sent_at: sentAt });

    createAuditLog({
      user_id: userId,
      action: 'MARK_SENT',
      entity: 'appointment_reminder',
      entity_id: reminder.id,
      diff: { before, after: reminder },
      ip_address: ipAddress,
    }).catch(() => {});

    return reminder;
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
  deleteAppointmentReminder,
  markAppointmentReminderSent,
};
