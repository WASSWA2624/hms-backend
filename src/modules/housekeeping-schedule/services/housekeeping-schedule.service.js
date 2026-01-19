/**
 * Housekeeping schedule service
 *
 * @module modules/housekeeping-schedule/services
 * @description Business logic for housekeeping schedule operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const housekeepingScheduleRepository = require('@repositories/housekeeping-schedule/housekeeping-schedule.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List housekeeping schedules with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.facility_id] - Filter by facility ID
 * @param {string} [filters.room_id] - Filter by room ID
 * @param {string} [filters.frequency] - Filter by frequency
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated housekeeping schedules
 */
const listHousekeepingSchedules = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  // Build repository filters
  const repoFilters = {};

  if (filters.facility_id) {
    repoFilters.facility_id = filters.facility_id;
  }

  if (filters.room_id) {
    repoFilters.room_id = filters.room_id;
  }

  if (filters.frequency) {
    repoFilters.frequency = { contains: filters.frequency, mode: 'insensitive' };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort order
  const orderBy = {};
  orderBy[sort_by] = order;

  // Fetch housekeeping schedules and count
  const [housekeepingSchedules, total] = await Promise.all([
    housekeepingScheduleRepository.findMany(repoFilters, skip, limit, orderBy),
    housekeepingScheduleRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    housekeepingSchedules,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage
    }
  };
};

/**
 * Get housekeeping schedule by ID
 *
 * @param {string} id - Housekeeping schedule ID
 * @returns {Promise<Object>} Housekeeping schedule data
 */
const getHousekeepingScheduleById = async (id) => {
  const housekeepingSchedule = await housekeepingScheduleRepository.findById(id);
  
  if (!housekeepingSchedule) {
    throw new HttpError('errors.housekeeping_schedule.not_found', 404);
  }

  return housekeepingSchedule;
};

/**
 * Create new housekeeping schedule
 *
 * @param {Object} data - Housekeeping schedule data
 * @param {string} [data.facility_id] - Facility ID
 * @param {string} [data.room_id] - Room ID
 * @param {string} [data.frequency] - Frequency
 * @param {string} [data.start_date] - Start date
 * @param {string} [data.end_date] - End date
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Created housekeeping schedule
 */
const createHousekeepingSchedule = async (data, context = {}) => {
  // Create housekeeping schedule
  const housekeepingSchedule = await housekeepingScheduleRepository.create(data);

  // Create audit log
  await createAuditLog({
    action: 'HOUSEKEEPING_SCHEDULE_CREATED',
    entity: 'housekeeping_schedule',
    entity_id: housekeepingSchedule.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      facility_id: housekeepingSchedule.facility_id,
      room_id: housekeepingSchedule.room_id,
      frequency: housekeepingSchedule.frequency,
      start_date: housekeepingSchedule.start_date,
      end_date: housekeepingSchedule.end_date
    }
  });

  return housekeepingSchedule;
};

/**
 * Update housekeeping schedule
 *
 * @param {string} id - Housekeeping schedule ID
 * @param {Object} data - Update data
 * @param {string} [data.facility_id] - Facility ID
 * @param {string} [data.room_id] - Room ID
 * @param {string} [data.frequency] - Frequency
 * @param {string} [data.start_date] - Start date
 * @param {string} [data.end_date] - End date
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Updated housekeeping schedule
 */
const updateHousekeepingSchedule = async (id, data, context = {}) => {
  // Check if housekeeping schedule exists and get before state
  const beforeHousekeepingSchedule = await housekeepingScheduleRepository.findById(id);
  
  if (!beforeHousekeepingSchedule) {
    throw new HttpError('errors.housekeeping_schedule.not_found', 404);
  }

  // Update housekeeping schedule
  const housekeepingSchedule = await housekeepingScheduleRepository.update(id, data);

  // Create audit log
  await createAuditLog({
    action: 'HOUSEKEEPING_SCHEDULE_UPDATED',
    entity: 'housekeeping_schedule',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      before: {
        facility_id: beforeHousekeepingSchedule.facility_id,
        room_id: beforeHousekeepingSchedule.room_id,
        frequency: beforeHousekeepingSchedule.frequency,
        start_date: beforeHousekeepingSchedule.start_date,
        end_date: beforeHousekeepingSchedule.end_date
      },
      after: {
        facility_id: housekeepingSchedule.facility_id,
        room_id: housekeepingSchedule.room_id,
        frequency: housekeepingSchedule.frequency,
        start_date: housekeepingSchedule.start_date,
        end_date: housekeepingSchedule.end_date
      }
    }
  });

  return housekeepingSchedule;
};

/**
 * Delete housekeeping schedule (soft delete)
 *
 * @param {string} id - Housekeeping schedule ID
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<void>}
 */
const deleteHousekeepingSchedule = async (id, context = {}) => {
  // Check if housekeeping schedule exists
  const housekeepingSchedule = await housekeepingScheduleRepository.findById(id);
  
  if (!housekeepingSchedule) {
    throw new HttpError('errors.housekeeping_schedule.not_found', 404);
  }

  // Soft delete housekeeping schedule
  await housekeepingScheduleRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    action: 'HOUSEKEEPING_SCHEDULE_DELETED',
    entity: 'housekeeping_schedule',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      facility_id: housekeepingSchedule.facility_id,
      room_id: housekeepingSchedule.room_id,
      frequency: housekeepingSchedule.frequency
    }
  });
};

module.exports = {
  listHousekeepingSchedules,
  getHousekeepingScheduleById,
  createHousekeepingSchedule,
  updateHousekeepingSchedule,
  deleteHousekeepingSchedule
};
