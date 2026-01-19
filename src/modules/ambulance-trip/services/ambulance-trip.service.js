/**
 * Ambulance Trip service
 *
 * @module modules/ambulance-trip/services
 * @description Business logic for ambulance trip operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const ambulanceTripRepository = require('@repositories/ambulance-trip/ambulance-trip.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List ambulance trips with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.ambulance_id] - Filter by ambulance ID
 * @param {string} [filters.emergency_case_id] - Filter by emergency case ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated ambulance trips
 */
const listAmbulanceTrips = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  // Build repository filters
  const repoFilters = {};

  if (filters.ambulance_id) {
    repoFilters.ambulance_id = filters.ambulance_id;
  }

  if (filters.emergency_case_id) {
    repoFilters.emergency_case_id = filters.emergency_case_id;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort order
  const orderBy = {};
  orderBy[sort_by] = order;

  // Fetch ambulance trips and count
  const [trips, total] = await Promise.all([
    ambulanceTripRepository.findMany(repoFilters, skip, limit, orderBy),
    ambulanceTripRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    trips,
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
 * Get ambulance trip by ID
 *
 * @param {string} id - Ambulance Trip ID
 * @returns {Promise<Object>} Ambulance Trip data
 */
const getAmbulanceTripById = async (id) => {
  const trip = await ambulanceTripRepository.findById(id);
  
  if (!trip) {
    throw new HttpError('errors.ambulance_trip.not_found', 404);
  }

  return trip;
};

/**
 * Create new ambulance trip
 *
 * @param {Object} data - Ambulance Trip data
 * @param {string} data.ambulance_id - Ambulance ID
 * @param {string} data.emergency_case_id - Emergency Case ID
 * @param {string} [data.started_at] - Started at timestamp
 * @param {string} [data.ended_at] - Ended at timestamp
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Created ambulance trip
 */
const createAmbulanceTrip = async (data, context = {}) => {
  // Create ambulance trip
  const trip = await ambulanceTripRepository.create(data);

  // Create audit log
  await createAuditLog({
    action: 'AMBULANCE_TRIP_CREATED',
    entity: 'ambulance_trip',
    entity_id: trip.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      ambulance_id: trip.ambulance_id,
      emergency_case_id: trip.emergency_case_id,
      started_at: trip.started_at,
      ended_at: trip.ended_at
    }
  });

  return trip;
};

/**
 * Update ambulance trip
 *
 * @param {string} id - Ambulance Trip ID
 * @param {Object} data - Update data
 * @param {string} [data.ambulance_id] - Ambulance ID
 * @param {string} [data.emergency_case_id] - Emergency Case ID
 * @param {string} [data.started_at] - Started at timestamp
 * @param {string} [data.ended_at] - Ended at timestamp
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Updated ambulance trip
 */
const updateAmbulanceTrip = async (id, data, context = {}) => {
  // Check if ambulance trip exists and get before state
  const beforeTrip = await ambulanceTripRepository.findById(id);
  
  if (!beforeTrip) {
    throw new HttpError('errors.ambulance_trip.not_found', 404);
  }

  // Update ambulance trip
  const trip = await ambulanceTripRepository.update(id, data);

  // Create audit log
  await createAuditLog({
    action: 'AMBULANCE_TRIP_UPDATED',
    entity: 'ambulance_trip',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      before: {
        ambulance_id: beforeTrip.ambulance_id,
        emergency_case_id: beforeTrip.emergency_case_id,
        started_at: beforeTrip.started_at,
        ended_at: beforeTrip.ended_at
      },
      after: {
        ambulance_id: trip.ambulance_id,
        emergency_case_id: trip.emergency_case_id,
        started_at: trip.started_at,
        ended_at: trip.ended_at
      }
    }
  });

  return trip;
};

/**
 * Delete ambulance trip (soft delete)
 *
 * @param {string} id - Ambulance Trip ID
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<void>}
 */
const deleteAmbulanceTrip = async (id, context = {}) => {
  // Check if ambulance trip exists
  const trip = await ambulanceTripRepository.findById(id);
  
  if (!trip) {
    throw new HttpError('errors.ambulance_trip.not_found', 404);
  }

  // Soft delete ambulance trip
  await ambulanceTripRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    action: 'AMBULANCE_TRIP_DELETED',
    entity: 'ambulance_trip',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      ambulance_id: trip.ambulance_id,
      emergency_case_id: trip.emergency_case_id,
      started_at: trip.started_at,
      ended_at: trip.ended_at
    }
  });
};

module.exports = {
  listAmbulanceTrips,
  getAmbulanceTripById,
  createAmbulanceTrip,
  updateAmbulanceTrip,
  deleteAmbulanceTrip
};
