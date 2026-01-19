/**
 * Ambulance Dispatch service
 *
 * @module modules/ambulance-dispatch/services
 * @description Business logic for ambulance dispatch operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const ambulanceDispatchRepository = require('@repositories/ambulance-dispatch/ambulance-dispatch.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List ambulance dispatches with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.ambulance_id] - Filter by ambulance ID
 * @param {string} [filters.emergency_case_id] - Filter by emergency case ID
 * @param {string} [filters.status] - Filter by status
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated ambulance dispatches
 */
const listAmbulanceDispatches = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  // Build repository filters
  const repoFilters = {};

  if (filters.ambulance_id) {
    repoFilters.ambulance_id = filters.ambulance_id;
  }

  if (filters.emergency_case_id) {
    repoFilters.emergency_case_id = filters.emergency_case_id;
  }

  if (filters.status) {
    repoFilters.status = filters.status;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort order
  const orderBy = {};
  orderBy[sort_by] = order;

  // Fetch ambulance dispatches and count
  const [dispatches, total] = await Promise.all([
    ambulanceDispatchRepository.findMany(repoFilters, skip, limit, orderBy),
    ambulanceDispatchRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    dispatches,
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
 * Get ambulance dispatch by ID
 *
 * @param {string} id - Ambulance Dispatch ID
 * @returns {Promise<Object>} Ambulance Dispatch data
 */
const getAmbulanceDispatchById = async (id) => {
  const dispatch = await ambulanceDispatchRepository.findById(id);
  
  if (!dispatch) {
    throw new HttpError('errors.ambulance_dispatch.not_found', 404);
  }

  return dispatch;
};

/**
 * Create new ambulance dispatch
 *
 * @param {Object} data - Ambulance Dispatch data
 * @param {string} data.ambulance_id - Ambulance ID
 * @param {string} data.emergency_case_id - Emergency Case ID
 * @param {string} [data.dispatched_at] - Dispatched at timestamp
 * @param {string} data.status - Dispatch status
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Created ambulance dispatch
 */
const createAmbulanceDispatch = async (data, context = {}) => {
  // Create ambulance dispatch
  const dispatch = await ambulanceDispatchRepository.create(data);

  // Create audit log
  await createAuditLog({
    action: 'AMBULANCE_DISPATCH_CREATED',
    entity: 'ambulance_dispatch',
    entity_id: dispatch.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      ambulance_id: dispatch.ambulance_id,
      emergency_case_id: dispatch.emergency_case_id,
      dispatched_at: dispatch.dispatched_at,
      status: dispatch.status
    }
  });

  return dispatch;
};

/**
 * Update ambulance dispatch
 *
 * @param {string} id - Ambulance Dispatch ID
 * @param {Object} data - Update data
 * @param {string} [data.ambulance_id] - Ambulance ID
 * @param {string} [data.emergency_case_id] - Emergency Case ID
 * @param {string} [data.dispatched_at] - Dispatched at timestamp
 * @param {string} [data.status] - Dispatch status
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Updated ambulance dispatch
 */
const updateAmbulanceDispatch = async (id, data, context = {}) => {
  // Check if ambulance dispatch exists and get before state
  const beforeDispatch = await ambulanceDispatchRepository.findById(id);
  
  if (!beforeDispatch) {
    throw new HttpError('errors.ambulance_dispatch.not_found', 404);
  }

  // Update ambulance dispatch
  const dispatch = await ambulanceDispatchRepository.update(id, data);

  // Create audit log
  await createAuditLog({
    action: 'AMBULANCE_DISPATCH_UPDATED',
    entity: 'ambulance_dispatch',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      before: {
        ambulance_id: beforeDispatch.ambulance_id,
        emergency_case_id: beforeDispatch.emergency_case_id,
        dispatched_at: beforeDispatch.dispatched_at,
        status: beforeDispatch.status
      },
      after: {
        ambulance_id: dispatch.ambulance_id,
        emergency_case_id: dispatch.emergency_case_id,
        dispatched_at: dispatch.dispatched_at,
        status: dispatch.status
      }
    }
  });

  return dispatch;
};

/**
 * Delete ambulance dispatch (soft delete)
 *
 * @param {string} id - Ambulance Dispatch ID
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<void>}
 */
const deleteAmbulanceDispatch = async (id, context = {}) => {
  // Check if ambulance dispatch exists
  const dispatch = await ambulanceDispatchRepository.findById(id);
  
  if (!dispatch) {
    throw new HttpError('errors.ambulance_dispatch.not_found', 404);
  }

  // Soft delete ambulance dispatch
  await ambulanceDispatchRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    action: 'AMBULANCE_DISPATCH_DELETED',
    entity: 'ambulance_dispatch',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      ambulance_id: dispatch.ambulance_id,
      emergency_case_id: dispatch.emergency_case_id,
      dispatched_at: dispatch.dispatched_at,
      status: dispatch.status
    }
  });
};

module.exports = {
  listAmbulanceDispatches,
  getAmbulanceDispatchById,
  createAmbulanceDispatch,
  updateAmbulanceDispatch,
  deleteAmbulanceDispatch
};
