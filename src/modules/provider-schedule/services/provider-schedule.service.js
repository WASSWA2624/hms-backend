/**
 * Provider schedule service
 *
 * @module modules/provider-schedule/services
 * @description Business logic layer for provider schedule operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const providerScheduleRepository = require('../repositories/provider-schedule.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List provider schedules with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Provider schedules and pagination data
 */
const listProviderSchedules = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.provider_user_id) whereClause.provider_user_id = filters.provider_user_id;
    if (filters.day_of_week !== undefined) whereClause.day_of_week = filters.day_of_week;

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
 * Get provider schedule by ID
 *
 * @param {string} id - Provider schedule ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Provider schedule data
 */
const getProviderScheduleById = async (id, userId, ipAddress) => {
  try {
    const schedule = await providerScheduleRepository.findById(id);

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
    const schedule = await providerScheduleRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'provider_schedule',
      entity_id: schedule.id,
      diff: { after: schedule },
      ip_address: ipAddress
    }).catch(() => {});

    return schedule;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update provider schedule
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Provider schedule ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated provider schedule
 */
const updateProviderSchedule = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await providerScheduleRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.provider_schedule.not_found', 404);
    }

    const schedule = await providerScheduleRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'provider_schedule',
      entity_id: schedule.id,
      diff: { before, after: schedule },
      ip_address: ipAddress
    }).catch(() => {});

    return schedule;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete provider schedule (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Provider schedule ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteProviderSchedule = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await providerScheduleRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.provider_schedule.not_found', 404);
    }

    await providerScheduleRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'provider_schedule',
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
  listProviderSchedules,
  getProviderScheduleById,
  createProviderSchedule,
  updateProviderSchedule,
  deleteProviderSchedule
};
