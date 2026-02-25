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

const PROVIDER_SCHEDULE_INCLUDE = {
  provider: {
    include: {
      profile: true
    }
  },
  facility: true
};

const normalizeIdentifier = (value) => (typeof value === 'string' ? value.trim() : '');
const isUuid = (value) => UUID_REGEX.test(normalizeIdentifier(value));

const resolveUserByIdentifier = async (identifier, tenantId = null) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;
  if (!prisma?.user?.findFirst) {
    return { id: normalized };
  }

  const where = {
    deleted_at: null,
    ...(tenantId ? { tenant_id: tenantId } : {})
  };

  const userWhere = isUuid(normalized)
    ? { ...where, id: normalized }
    : {
        ...where,
        OR: [
          { human_friendly_id: normalized.toUpperCase() },
          { email: normalized },
          { phone: normalized }
        ]
      };

  return prisma.user.findFirst({ where: userWhere });
};

const resolveProviderScheduleByIdentifier = async (identifier) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;
  if (isUuid(normalized)) {
    return providerScheduleRepository.findById(normalized);
  }

  if (!prisma?.provider_schedule?.findFirst) {
    return providerScheduleRepository.findById(normalized);
  }

  return prisma.provider_schedule.findFirst({
    where: {
      human_friendly_id: normalized.toUpperCase(),
      deleted_at: null
    },
    include: PROVIDER_SCHEDULE_INCLUDE
  });
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
            hasPreviousPage: page > 1
          }
        };
      }
      whereClause.provider_user_id = resolvedProvider.id;
    }

    const [schedules, total] = await Promise.all([
      providerScheduleRepository.findMany(whereClause, skip, limit, orderBy),
      providerScheduleRepository.count(whereClause)
    ]);

    return {
      schedules,
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

    const payload = {
      ...data,
      provider_user_id: provider.id
    };

    const createdSchedule = await providerScheduleRepository.create(payload);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'provider_schedule',
      entity_id: createdSchedule.id,
      diff: { after: createdSchedule },
      ip_address: ipAddress
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

    const updatedSchedule = await providerScheduleRepository.update(before.id, payload);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'provider_schedule',
      entity_id: updatedSchedule.id,
      diff: { before, after: updatedSchedule },
      ip_address: ipAddress
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

    await providerScheduleRepository.softDelete(before.id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'provider_schedule',
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
  listProviderSchedules,
  getProviderScheduleById,
  createProviderSchedule,
  updateProviderSchedule,
  deleteProviderSchedule
};
