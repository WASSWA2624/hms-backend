/**
 * Housekeeping task service
 *
 * @module modules/housekeeping-task/services
 * @description Business logic for housekeeping task operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const housekeepingTaskRepository = require('@repositories/housekeeping-task/housekeeping-task.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List housekeeping tasks with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.facility_id] - Filter by facility ID
 * @param {string} [filters.room_id] - Filter by room ID
 * @param {string} [filters.assigned_to_staff_id] - Filter by assigned staff ID
 * @param {string} [filters.status] - Filter by status
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated housekeeping tasks
 */
const listHousekeepingTasks = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  // Build repository filters
  const repoFilters = {};

  if (filters.facility_id) {
    repoFilters.facility_id = filters.facility_id;
  }

  if (filters.room_id) {
    repoFilters.room_id = filters.room_id;
  }

  if (filters.assigned_to_staff_id) {
    repoFilters.assigned_to_staff_id = filters.assigned_to_staff_id;
  }

  if (filters.status) {
    repoFilters.status = filters.status;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort order
  const orderBy = {};
  orderBy[sort_by] = order;

  // Fetch housekeeping tasks and count
  const [housekeepingTasks, total] = await Promise.all([
    housekeepingTaskRepository.findMany(repoFilters, skip, limit, orderBy),
    housekeepingTaskRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    housekeepingTasks,
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
 * Get housekeeping task by ID
 *
 * @param {string} id - Housekeeping task ID
 * @returns {Promise<Object>} Housekeeping task data
 */
const getHousekeepingTaskById = async (id) => {
  const housekeepingTask = await housekeepingTaskRepository.findById(id);
  
  if (!housekeepingTask) {
    throw new HttpError('errors.housekeeping_task.not_found', 404);
  }

  return housekeepingTask;
};

/**
 * Create new housekeeping task
 *
 * @param {Object} data - Housekeeping task data
 * @param {string} [data.facility_id] - Facility ID
 * @param {string} [data.room_id] - Room ID
 * @param {string} [data.assigned_to_staff_id] - Assigned staff ID
 * @param {string} data.status - Status
 * @param {string} [data.scheduled_at] - Scheduled date/time
 * @param {string} [data.completed_at] - Completed date/time
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Created housekeeping task
 */
const createHousekeepingTask = async (data, context = {}) => {
  // Create housekeeping task
  const housekeepingTask = await housekeepingTaskRepository.create(data);

  // Create audit log
  await createAuditLog({
    action: 'HOUSEKEEPING_TASK_CREATED',
    entity: 'housekeeping_task',
    entity_id: housekeepingTask.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      facility_id: housekeepingTask.facility_id,
      room_id: housekeepingTask.room_id,
      assigned_to_staff_id: housekeepingTask.assigned_to_staff_id,
      status: housekeepingTask.status,
      scheduled_at: housekeepingTask.scheduled_at,
      completed_at: housekeepingTask.completed_at
    }
  });

  return housekeepingTask;
};

/**
 * Update housekeeping task
 *
 * @param {string} id - Housekeeping task ID
 * @param {Object} data - Update data
 * @param {string} [data.facility_id] - Facility ID
 * @param {string} [data.room_id] - Room ID
 * @param {string} [data.assigned_to_staff_id] - Assigned staff ID
 * @param {string} [data.status] - Status
 * @param {string} [data.scheduled_at] - Scheduled date/time
 * @param {string} [data.completed_at] - Completed date/time
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Updated housekeeping task
 */
const updateHousekeepingTask = async (id, data, context = {}) => {
  // Check if housekeeping task exists and get before state
  const beforeHousekeepingTask = await housekeepingTaskRepository.findById(id);
  
  if (!beforeHousekeepingTask) {
    throw new HttpError('errors.housekeeping_task.not_found', 404);
  }

  // Update housekeeping task
  const housekeepingTask = await housekeepingTaskRepository.update(id, data);

  // Create audit log
  await createAuditLog({
    action: 'HOUSEKEEPING_TASK_UPDATED',
    entity: 'housekeeping_task',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      before: {
        facility_id: beforeHousekeepingTask.facility_id,
        room_id: beforeHousekeepingTask.room_id,
        assigned_to_staff_id: beforeHousekeepingTask.assigned_to_staff_id,
        status: beforeHousekeepingTask.status,
        scheduled_at: beforeHousekeepingTask.scheduled_at,
        completed_at: beforeHousekeepingTask.completed_at
      },
      after: {
        facility_id: housekeepingTask.facility_id,
        room_id: housekeepingTask.room_id,
        assigned_to_staff_id: housekeepingTask.assigned_to_staff_id,
        status: housekeepingTask.status,
        scheduled_at: housekeepingTask.scheduled_at,
        completed_at: housekeepingTask.completed_at
      }
    }
  });

  return housekeepingTask;
};

/**
 * Delete housekeeping task (soft delete)
 *
 * @param {string} id - Housekeeping task ID
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<void>}
 */
const deleteHousekeepingTask = async (id, context = {}) => {
  // Check if housekeeping task exists
  const housekeepingTask = await housekeepingTaskRepository.findById(id);
  
  if (!housekeepingTask) {
    throw new HttpError('errors.housekeeping_task.not_found', 404);
  }

  // Soft delete housekeeping task
  await housekeepingTaskRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    action: 'HOUSEKEEPING_TASK_DELETED',
    entity: 'housekeeping_task',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      facility_id: housekeepingTask.facility_id,
      room_id: housekeepingTask.room_id,
      assigned_to_staff_id: housekeepingTask.assigned_to_staff_id,
      status: housekeepingTask.status
    }
  });
};

module.exports = {
  listHousekeepingTasks,
  getHousekeepingTaskById,
  createHousekeepingTask,
  updateHousekeepingTask,
  deleteHousekeepingTask
};
