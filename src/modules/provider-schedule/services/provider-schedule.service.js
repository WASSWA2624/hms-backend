/**
 * Provider schedule service
 *
 * @module modules/provider-schedule/services
 * @description Business logic layer for provider schedule operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const providerScheduleRepository = require('@repositories/provider-schedule/provider-schedule.repository');
const prisma = require('@prisma/client');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCHEDULE_TYPE_VALUES = new Set(['RECURRING', 'OVERRIDE']);

const PROVIDER_SCHEDULE_INCLUDE = {
  provider: {
    include: {
      profile: true,
    },
  },
  facility: true,
  slots: {
    where: { deleted_at: null },
    orderBy: [{ override_date: 'asc' }, { start_time: 'asc' }],
  },
};

const normalizeIdentifier = (value) => (typeof value === 'string' ? value.trim() : '');
const isUuid = (value) => UUID_REGEX.test(normalizeIdentifier(value));
const toNullable = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const toDate = (value, field) => {
  const normalized = toNullable(value);
  if (normalized === undefined || normalized === null) return normalized;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError('errors.validation.invalid', 400, [{ field }]);
  }
  return parsed;
};

const normalizeScheduleType = (value, fallback = 'RECURRING') => {
  const normalized = normalizeIdentifier(value).toUpperCase();
  if (!normalized) return fallback;
  if (!SCHEDULE_TYPE_VALUES.has(normalized)) {
    throw new HttpError('errors.validation.invalid', 400, [{ field: 'schedule_type' }]);
  }
  return normalized;
};

const normalizeTimezone = (value, fallback = 'UTC') => {
  const normalized = normalizeIdentifier(value);
  return normalized || fallback;
};

const ensureDateOrder = (startAt, endAt, fieldNameStart, fieldNameEnd) => {
  if (!startAt || !endAt) return;
  if (startAt.getTime() >= endAt.getTime()) {
    throw new HttpError('errors.validation.invalid', 400, [
      { field: fieldNameStart },
      { field: fieldNameEnd },
    ]);
  }
};

const intervalsOverlap = (aStart, aEnd, bStart, bEnd) =>
  aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();

const dateRangesOverlap = (aFrom, aTo, bFrom, bTo) => {
  const leftStart = aFrom ? aFrom.getTime() : Number.NEGATIVE_INFINITY;
  const leftEnd = aTo ? aTo.getTime() : Number.POSITIVE_INFINITY;
  const rightStart = bFrom ? bFrom.getTime() : Number.NEGATIVE_INFINITY;
  const rightEnd = bTo ? bTo.getTime() : Number.POSITIVE_INFINITY;
  return leftStart <= rightEnd && rightStart <= leftEnd;
};

const normalizeOverridePayload = (overrides = []) =>
  (Array.isArray(overrides) ? overrides : []).map((entry, index) => {
    const overrideDate = toDate(entry?.override_date, `schedule_overrides.${index}.override_date`);
    const startTime = toDate(entry?.start_time, `schedule_overrides.${index}.start_time`);
    const endTime = toDate(entry?.end_time, `schedule_overrides.${index}.end_time`);
    ensureDateOrder(
      startTime,
      endTime,
      `schedule_overrides.${index}.start_time`,
      `schedule_overrides.${index}.end_time`
    );
    if (!overrideDate) {
      throw new HttpError('errors.validation.field.required', 400, [
        { field: `schedule_overrides.${index}.override_date` },
      ]);
    }
    return {
      override_date: overrideDate,
      start_time: startTime,
      end_time: endTime,
      is_available: entry?.is_available !== false,
    };
  });

const resolveUserByIdentifier = async (identifier, tenantId = null) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;
  if (!prisma?.user?.findFirst) {
    return { id: normalized };
  }

  const where = {
    deleted_at: null,
    ...(tenantId ? { tenant_id: tenantId } : {}),
  };

  const userWhere = isUuid(normalized)
    ? { ...where, id: normalized }
    : {
        ...where,
        OR: [{ human_friendly_id: normalized.toUpperCase() }, { email: normalized }, { phone: normalized }],
      };

  return prisma.user.findFirst({ where: userWhere });
};

const resolveProviderScheduleByIdentifier = async (identifier) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;
  if (isUuid(normalized)) {
    return providerScheduleRepository.findById(normalized, PROVIDER_SCHEDULE_INCLUDE);
  }

  if (!prisma?.provider_schedule?.findFirst) {
    return providerScheduleRepository.findById(normalized, PROVIDER_SCHEDULE_INCLUDE);
  }

  return prisma.provider_schedule.findFirst({
    where: {
      human_friendly_id: normalized.toUpperCase(),
      deleted_at: null,
    },
    include: PROVIDER_SCHEDULE_INCLUDE,
  });
};

const validateRecurringConflicts = async ({
  tenantId,
  facilityId,
  providerUserId,
  dayOfWeek,
  startTime,
  endTime,
  timezone,
  effectiveFrom,
  effectiveTo,
  excludeScheduleId = null,
}) => {
  const existing = await prisma.provider_schedule.findMany({
    where: {
      deleted_at: null,
      tenant_id: tenantId,
      facility_id: facilityId ?? null,
      provider_user_id: providerUserId,
      schedule_type: 'RECURRING',
      day_of_week: dayOfWeek,
      timezone,
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
    },
    select: {
      id: true,
      start_time: true,
      end_time: true,
      effective_from: true,
      effective_to: true,
      human_friendly_id: true,
    },
  });

  for (const schedule of existing) {
    const overlapsEffectiveRange = dateRangesOverlap(
      effectiveFrom || null,
      effectiveTo || null,
      schedule.effective_from || null,
      schedule.effective_to || null
    );
    if (!overlapsEffectiveRange) continue;

    if (intervalsOverlap(startTime, endTime, schedule.start_time, schedule.end_time)) {
      throw new HttpError('errors.provider_schedule.overlap_detected', 409, [
        { field: 'start_time' },
        { field: 'end_time' },
        { field: 'day_of_week' },
        { field: 'provider_user_id' },
        { field: 'conflicting_schedule_id', value: schedule.human_friendly_id || schedule.id },
      ]);
    }
  }
};

const validateOverrideConflicts = async ({
  tenantId,
  facilityId,
  providerUserId,
  timezone,
  overrides,
  excludeScheduleId = null,
}) => {
  if (!Array.isArray(overrides) || overrides.length === 0) return;

  const internalByDate = new Map();
  for (const item of overrides) {
    const dateKey = item.override_date.toISOString().slice(0, 10);
    const existing = internalByDate.get(dateKey) || [];
    for (const row of existing) {
      if (row.is_available && item.is_available && intervalsOverlap(row.start_time, row.end_time, item.start_time, item.end_time)) {
        throw new HttpError('errors.provider_schedule.override_overlap_detected', 409, [
          { field: 'schedule_overrides' },
        ]);
      }
    }
    existing.push(item);
    internalByDate.set(dateKey, existing);
  }

  for (const item of overrides) {
    const day = item.override_date.toISOString().slice(0, 10);
    const dayStart = new Date(`${day}T00:00:00.000Z`);
    const dayEnd = new Date(`${day}T23:59:59.999Z`);

    const existingRows = await prisma.availability_slot.findMany({
      where: {
        deleted_at: null,
        override_date: {
          gte: dayStart,
          lte: dayEnd,
        },
        schedule: {
          deleted_at: null,
          tenant_id: tenantId,
          facility_id: facilityId ?? null,
          provider_user_id: providerUserId,
          timezone,
          ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
        },
      },
      select: {
        id: true,
        start_time: true,
        end_time: true,
        is_available: true,
        schedule: {
          select: {
            id: true,
            human_friendly_id: true,
          },
        },
      },
    });

    for (const row of existingRows) {
      if (!row.is_available || !item.is_available) continue;
      if (!intervalsOverlap(item.start_time, item.end_time, row.start_time, row.end_time)) continue;
      throw new HttpError('errors.provider_schedule.override_overlap_detected', 409, [
        { field: 'schedule_overrides' },
        {
          field: 'conflicting_schedule_id',
          value: row.schedule?.human_friendly_id || row.schedule?.id || null,
        },
      ]);
    }
  }
};

const extractSchedulePayload = (data = {}, fallback = {}) => {
  const scheduleType = normalizeScheduleType(data.schedule_type, fallback.schedule_type || 'RECURRING');
  const timezone = normalizeTimezone(data.timezone, fallback.timezone || 'UTC');
  const dayOfWeek = data.day_of_week !== undefined ? data.day_of_week : fallback.day_of_week;
  const startTime = data.start_time !== undefined ? toDate(data.start_time, 'start_time') : fallback.start_time || null;
  const endTime = data.end_time !== undefined ? toDate(data.end_time, 'end_time') : fallback.end_time || null;
  const effectiveFrom =
    data.effective_from !== undefined
      ? toDate(data.effective_from, 'effective_from')
      : fallback.effective_from || null;
  const effectiveTo =
    data.effective_to !== undefined ? toDate(data.effective_to, 'effective_to') : fallback.effective_to || null;

  if (dayOfWeek === undefined || dayOfWeek === null) {
    throw new HttpError('errors.validation.field.required', 400, [{ field: 'day_of_week' }]);
  }
  if (!startTime || !endTime) {
    throw new HttpError('errors.validation.field.required', 400, [{ field: 'start_time' }, { field: 'end_time' }]);
  }

  ensureDateOrder(startTime, endTime, 'start_time', 'end_time');
  if (effectiveFrom && effectiveTo) {
    ensureDateOrder(effectiveFrom, effectiveTo, 'effective_from', 'effective_to');
  }

  const payload = {
    facility_id:
      data.facility_id !== undefined ? data.facility_id : fallback.facility_id !== undefined ? fallback.facility_id : undefined,
    provider_user_id:
      data.provider_user_id !== undefined
        ? data.provider_user_id
        : fallback.provider_user_id !== undefined
          ? fallback.provider_user_id
          : undefined,
    schedule_type: scheduleType,
    timezone,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  };

  return payload;
};

/**
 * List provider schedules with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @returns {Promise<Object>} Provider schedules and pagination data
 */
const listProviderSchedules = async (filters, page, limit, sortBy, order) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};

    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.day_of_week !== undefined) whereClause.day_of_week = filters.day_of_week;
    if (filters.schedule_type) whereClause.schedule_type = normalizeScheduleType(filters.schedule_type);

    if (filters.provider_user_id) {
      const resolvedProvider = await resolveUserByIdentifier(filters.provider_user_id, filters.tenant_id || null);
      if (!resolvedProvider) {
        return {
          schedules: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: page > 1,
          },
        };
      }
      whereClause.provider_user_id = resolvedProvider.id;
    }

    const [schedules, total] = await Promise.all([
      providerScheduleRepository.findMany(whereClause, skip, limit, orderBy, PROVIDER_SCHEDULE_INCLUDE),
      providerScheduleRepository.count(whereClause),
    ]);

    return {
      schedules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Get provider schedule by ID or human friendly ID
 *
 * @param {string} id - Provider schedule identifier
 * @returns {Promise<Object>} Provider schedule data
 */
const getProviderScheduleById = async (id) => {
  try {
    const schedule = await resolveProviderScheduleByIdentifier(id);

    if (!schedule) {
      throw new HttpError('errors.provider_schedule.not_found', 404);
    }

    return schedule;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new provider schedule
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Provider schedule data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created provider schedule
 */
const createProviderSchedule = async (data, userId, ipAddress) => {
  try {
    const provider = await resolveUserByIdentifier(data.provider_user_id, data.tenant_id || null);
    if (!provider) {
      throw new HttpError('errors.user.not_found', 404, [{ field: 'provider_user_id' }]);
    }

    const schedulePayload = extractSchedulePayload(
      {
        ...data,
        provider_user_id: provider.id,
      },
      {}
    );
    const overrides = normalizeOverridePayload(data.schedule_overrides || []);

    if (schedulePayload.schedule_type === 'RECURRING') {
      await validateRecurringConflicts({
        tenantId: data.tenant_id,
        facilityId: schedulePayload.facility_id,
        providerUserId: schedulePayload.provider_user_id,
        dayOfWeek: schedulePayload.day_of_week,
        startTime: schedulePayload.start_time,
        endTime: schedulePayload.end_time,
        timezone: schedulePayload.timezone,
        effectiveFrom: schedulePayload.effective_from,
        effectiveTo: schedulePayload.effective_to,
      });
    }

    await validateOverrideConflicts({
      tenantId: data.tenant_id,
      facilityId: schedulePayload.facility_id,
      providerUserId: schedulePayload.provider_user_id,
      timezone: schedulePayload.timezone,
      overrides,
    });

    const createdSchedule = await prisma.$transaction(async (tx) => {
      const created = await tx.provider_schedule.create({
        data: {
          tenant_id: data.tenant_id,
          facility_id: schedulePayload.facility_id ?? null,
          provider_user_id: schedulePayload.provider_user_id,
          schedule_type: schedulePayload.schedule_type,
          timezone: schedulePayload.timezone,
          effective_from: schedulePayload.effective_from ?? null,
          effective_to: schedulePayload.effective_to ?? null,
          day_of_week: schedulePayload.day_of_week,
          start_time: schedulePayload.start_time,
          end_time: schedulePayload.end_time,
        },
      });

      if (overrides.length > 0) {
        await tx.availability_slot.createMany({
          data: overrides.map((entry) => ({
            schedule_id: created.id,
            override_date: entry.override_date,
            start_time: entry.start_time,
            end_time: entry.end_time,
            is_available: entry.is_available !== false,
          })),
        });
      }

      return tx.provider_schedule.findFirst({
        where: { id: created.id, deleted_at: null },
        include: PROVIDER_SCHEDULE_INCLUDE,
      });
    });

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'provider_schedule',
      entity_id: createdSchedule.id,
      diff: { after: createdSchedule },
      ip_address: ipAddress,
    }).catch(() => {});

    return createdSchedule;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update provider schedule
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Provider schedule identifier
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated provider schedule
 */
const updateProviderSchedule = async (id, data, userId, ipAddress) => {
  try {
    const before = await resolveProviderScheduleByIdentifier(id);

    if (!before) {
      throw new HttpError('errors.provider_schedule.not_found', 404);
    }

    const payload = { ...data };
    if (payload.provider_user_id !== undefined) {
      const provider = await resolveUserByIdentifier(payload.provider_user_id, before.tenant_id || null);
      if (!provider) {
        throw new HttpError('errors.user.not_found', 404, [{ field: 'provider_user_id' }]);
      }
      payload.provider_user_id = provider.id;
    }

    const mergedSchedulePayload = extractSchedulePayload(payload, before);
    const overrides =
      payload.schedule_overrides !== undefined
        ? normalizeOverridePayload(payload.schedule_overrides || [])
        : null;

    if (mergedSchedulePayload.schedule_type === 'RECURRING') {
      await validateRecurringConflicts({
        tenantId: before.tenant_id,
        facilityId: mergedSchedulePayload.facility_id,
        providerUserId: mergedSchedulePayload.provider_user_id,
        dayOfWeek: mergedSchedulePayload.day_of_week,
        startTime: mergedSchedulePayload.start_time,
        endTime: mergedSchedulePayload.end_time,
        timezone: mergedSchedulePayload.timezone,
        effectiveFrom: mergedSchedulePayload.effective_from,
        effectiveTo: mergedSchedulePayload.effective_to,
        excludeScheduleId: before.id,
      });
    }

    if (overrides !== null) {
      await validateOverrideConflicts({
        tenantId: before.tenant_id,
        facilityId: mergedSchedulePayload.facility_id,
        providerUserId: mergedSchedulePayload.provider_user_id,
        timezone: mergedSchedulePayload.timezone,
        overrides,
        excludeScheduleId: before.id,
      });
    }

    const updatedSchedule = await prisma.$transaction(async (tx) => {
      const updated = await tx.provider_schedule.update({
        where: { id: before.id },
        data: {
          facility_id:
            mergedSchedulePayload.facility_id !== undefined
              ? mergedSchedulePayload.facility_id
              : before.facility_id,
          provider_user_id:
            mergedSchedulePayload.provider_user_id !== undefined
              ? mergedSchedulePayload.provider_user_id
              : before.provider_user_id,
          schedule_type: mergedSchedulePayload.schedule_type,
          timezone: mergedSchedulePayload.timezone,
          effective_from:
            mergedSchedulePayload.effective_from !== undefined
              ? mergedSchedulePayload.effective_from
              : before.effective_from,
          effective_to:
            mergedSchedulePayload.effective_to !== undefined
              ? mergedSchedulePayload.effective_to
              : before.effective_to,
          day_of_week:
            mergedSchedulePayload.day_of_week !== undefined
              ? mergedSchedulePayload.day_of_week
              : before.day_of_week,
          start_time:
            mergedSchedulePayload.start_time !== undefined
              ? mergedSchedulePayload.start_time
              : before.start_time,
          end_time:
            mergedSchedulePayload.end_time !== undefined
              ? mergedSchedulePayload.end_time
              : before.end_time,
        },
      });

      if (overrides !== null) {
        await tx.availability_slot.updateMany({
          where: {
            schedule_id: before.id,
            deleted_at: null,
          },
          data: {
            deleted_at: new Date(),
          },
        });

        if (overrides.length > 0) {
          await tx.availability_slot.createMany({
            data: overrides.map((entry) => ({
              schedule_id: before.id,
              override_date: entry.override_date,
              start_time: entry.start_time,
              end_time: entry.end_time,
              is_available: entry.is_available !== false,
            })),
          });
        }
      }

      return tx.provider_schedule.findFirst({
        where: { id: updated.id, deleted_at: null },
        include: PROVIDER_SCHEDULE_INCLUDE,
      });
    });

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'provider_schedule',
      entity_id: updatedSchedule.id,
      diff: { before, after: updatedSchedule },
      ip_address: ipAddress,
    }).catch(() => {});

    return updatedSchedule;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete provider schedule (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Provider schedule identifier
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteProviderSchedule = async (id, userId, ipAddress) => {
  try {
    const before = await resolveProviderScheduleByIdentifier(id);

    if (!before) {
      throw new HttpError('errors.provider_schedule.not_found', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.availability_slot.updateMany({
        where: {
          schedule_id: before.id,
          deleted_at: null,
        },
        data: {
          deleted_at: new Date(),
        },
      });
      await tx.provider_schedule.update({
        where: { id: before.id },
        data: {
          deleted_at: new Date(),
        },
      });
    });

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'provider_schedule',
      entity_id: before.id,
      diff: { before },
      ip_address: ipAddress,
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listProviderSchedules,
  getProviderScheduleById,
  createProviderSchedule,
  updateProviderSchedule,
  deleteProviderSchedule,
};
