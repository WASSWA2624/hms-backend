/**
 * Availability slot service
 *
 * @module modules/availability-slot/services
 * @description Business logic layer for availability slot operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const availabilitySlotRepository = require('@repositories/availability-slot/availability-slot.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const { isUuidLike } = require('@lib/identifiers/sanitize-friendly-ids');
const {
  resolveModelIdByIdentifier,
  resolveModelRecordByIdentifier,
} = require('@lib/identifiers/resolve-entity-id');

const buildEmptyListResult = (page, limit) => ({
  slots: [],
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

const resolvePayloadIdentifier = async ({ value, field, model, where = {}, nullable = false }) => {
  if (value === undefined) return undefined;
  if (value === null) {
    if (nullable) return null;
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

const toDateValue = ({ value, field, nullable = false }) => {
  if (value === undefined) return undefined;
  if (value === null) {
    if (nullable) return null;
    throw new HttpError('errors.validation.field.required', 400, [{ field }]);
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError('errors.validation.invalid', 400, [{ field }]);
  }

  return parsed;
};

const assertTimeWindow = (startTime, endTime) => {
  if (!startTime || !endTime) return;
  if (startTime.getTime() >= endTime.getTime()) {
    throw new HttpError('errors.validation.invalid', 400, [{ field: 'start_time' }, { field: 'end_time' }]);
  }
};

const resolveAvailabilityPayload = async (data = {}, existing = null) => {
  const payload = { ...data };

  if (payload.schedule_id !== undefined) {
    payload.schedule_id = await resolvePayloadIdentifier({
      value: payload.schedule_id,
      field: 'schedule_id',
      model: 'provider_schedule',
    });
  }

  if (payload.override_date !== undefined) {
    payload.override_date = toDateValue({
      value: payload.override_date,
      field: 'override_date',
      nullable: true,
    });
  }

  const startTime =
    payload.start_time !== undefined
      ? toDateValue({ value: payload.start_time, field: 'start_time' })
      : existing?.start_time;
  const endTime =
    payload.end_time !== undefined
      ? toDateValue({ value: payload.end_time, field: 'end_time' })
      : existing?.end_time;

  assertTimeWindow(startTime, endTime);

  if (payload.start_time !== undefined) {
    payload.start_time = startTime;
  }
  if (payload.end_time !== undefined) {
    payload.end_time = endTime;
  }

  return payload;
};

const resolveAvailabilitySlotRecordByIdentifier = async (identifier) => {
  const resolved = await resolveModelRecordByIdentifier({
    model: 'availability_slot',
    identifier,
    select: { id: true },
  });
  if (!resolved?.id) return null;
  return availabilitySlotRepository.findById(resolved.id);
};

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
    
    const scheduleId = await resolveFilterIdentifier({
      value: filters.schedule_id,
      model: 'provider_schedule',
    });
    if (filters.schedule_id !== undefined && scheduleId === null) {
      return buildEmptyListResult(page, limit);
    }
    if (scheduleId) whereClause.schedule_id = scheduleId;

    if (filters.override_date) {
      const overrideDate = new Date(filters.override_date);
      const dayStart = new Date(overrideDate);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(overrideDate);
      dayEnd.setUTCHours(23, 59, 59, 999);
      whereClause.override_date = {
        gte: dayStart,
        lte: dayEnd,
      };
    }

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
    const slot = await resolveAvailabilitySlotRecordByIdentifier(id);

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
    const payload = await resolveAvailabilityPayload(data);
    const slot = await availabilitySlotRepository.create(payload);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'availability_slot',
      entity_id: slot.id,
      diff: { after: slot },
      ip_address: ipAddress
    }).catch(() => {});

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
    const before = await resolveAvailabilitySlotRecordByIdentifier(id);

    if (!before) {
      throw new HttpError('errors.availability_slot.not_found', 404);
    }

    const payload = await resolveAvailabilityPayload(data, before);
    const slot = await availabilitySlotRepository.update(before.id, payload);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'availability_slot',
      entity_id: slot.id,
      diff: { before, after: slot },
      ip_address: ipAddress
    }).catch(() => {});

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
    const before = await resolveAvailabilitySlotRecordByIdentifier(id);

    if (!before) {
      throw new HttpError('errors.availability_slot.not_found', 404);
    }

    await availabilitySlotRepository.softDelete(before.id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'availability_slot',
      entity_id: before.id,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
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
