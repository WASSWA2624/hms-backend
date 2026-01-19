/**
 * Ambulance service
 *
 * @module modules/ambulance/services
 * @description Business logic for ambulance operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const ambulanceRepository = require('@repositories/ambulance/ambulance.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List ambulances with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.tenant_id] - Filter by tenant ID
 * @param {string} [filters.facility_id] - Filter by facility ID
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.search] - Search by identifier
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated ambulances
 */
const listAmbulances = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  // Build repository filters
  const repoFilters = {};

  if (filters.tenant_id) {
    repoFilters.tenant_id = filters.tenant_id;
  }

  if (filters.facility_id) {
    repoFilters.facility_id = filters.facility_id;
  }

  if (filters.status) {
    repoFilters.status = filters.status;
  }

  // Handle search filter
  if (filters.search) {
    repoFilters.identifier = { contains: filters.search, mode: 'insensitive' };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort order
  const orderBy = {};
  orderBy[sort_by] = order;

  // Fetch ambulances and count
  const [ambulances, total] = await Promise.all([
    ambulanceRepository.findMany(repoFilters, skip, limit, orderBy),
    ambulanceRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    ambulances,
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
 * Get ambulance by ID
 *
 * @param {string} id - Ambulance ID
 * @returns {Promise<Object>} Ambulance data
 */
const getAmbulanceById = async (id) => {
  const ambulance = await ambulanceRepository.findById(id);
  
  if (!ambulance) {
    throw new HttpError('errors.ambulance.not_found', 404);
  }

  return ambulance;
};

/**
 * Create new ambulance
 *
 * @param {Object} data - Ambulance data
 * @param {string} data.tenant_id - Tenant ID
 * @param {string} [data.facility_id] - Facility ID
 * @param {string} data.identifier - Ambulance identifier
 * @param {string} data.status - Ambulance status
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Created ambulance
 */
const createAmbulance = async (data, context = {}) => {
  // Create ambulance
  const ambulance = await ambulanceRepository.create(data);

  // Create audit log
  await createAuditLog({
    action: 'AMBULANCE_CREATED',
    entity: 'ambulance',
    entity_id: ambulance.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      tenant_id: ambulance.tenant_id,
      facility_id: ambulance.facility_id,
      identifier: ambulance.identifier,
      status: ambulance.status
    }
  });

  return ambulance;
};

/**
 * Update ambulance
 *
 * @param {string} id - Ambulance ID
 * @param {Object} data - Update data
 * @param {string} [data.facility_id] - Facility ID
 * @param {string} [data.identifier] - Ambulance identifier
 * @param {string} [data.status] - Ambulance status
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Updated ambulance
 */
const updateAmbulance = async (id, data, context = {}) => {
  // Check if ambulance exists and get before state
  const beforeAmbulance = await ambulanceRepository.findById(id);
  
  if (!beforeAmbulance) {
    throw new HttpError('errors.ambulance.not_found', 404);
  }

  // Update ambulance
  const ambulance = await ambulanceRepository.update(id, data);

  // Create audit log
  await createAuditLog({
    action: 'AMBULANCE_UPDATED',
    entity: 'ambulance',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      before: {
        facility_id: beforeAmbulance.facility_id,
        identifier: beforeAmbulance.identifier,
        status: beforeAmbulance.status
      },
      after: {
        facility_id: ambulance.facility_id,
        identifier: ambulance.identifier,
        status: ambulance.status
      }
    }
  });

  return ambulance;
};

/**
 * Delete ambulance (soft delete)
 *
 * @param {string} id - Ambulance ID
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<void>}
 */
const deleteAmbulance = async (id, context = {}) => {
  // Check if ambulance exists
  const ambulance = await ambulanceRepository.findById(id);
  
  if (!ambulance) {
    throw new HttpError('errors.ambulance.not_found', 404);
  }

  // Soft delete ambulance
  await ambulanceRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    action: 'AMBULANCE_DELETED',
    entity: 'ambulance',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      tenant_id: ambulance.tenant_id,
      facility_id: ambulance.facility_id,
      identifier: ambulance.identifier,
      status: ambulance.status
    }
  });
};

module.exports = {
  listAmbulances,
  getAmbulanceById,
  createAmbulance,
  updateAmbulance,
  deleteAmbulance
};
