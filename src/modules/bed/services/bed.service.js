/**
 * Bed service
 *
 * @module modules/bed/services
 * @description Business logic for bed operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const bedRepository = require('@repositories/bed/bed.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List beds with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.tenant_id] - Filter by tenant ID
 * @param {string} [filters.facility_id] - Filter by facility ID
 * @param {string} [filters.ward_id] - Filter by ward ID
 * @param {string} [filters.room_id] - Filter by room ID
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.search] - Search by label
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated beds
 */
const listBeds = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  // Build repository filters
  const repoFilters = {};

  if (filters.tenant_id) {
    repoFilters.tenant_id = filters.tenant_id;
  }

  if (filters.facility_id) {
    repoFilters.facility_id = filters.facility_id;
  }

  if (filters.ward_id) {
    repoFilters.ward_id = filters.ward_id;
  }

  if (filters.room_id) {
    repoFilters.room_id = filters.room_id;
  }

  if (filters.status) {
    repoFilters.status = filters.status;
  }

  // Handle search filter
  if (filters.search) {
    repoFilters.label = { contains: filters.search, mode: 'insensitive' };
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort order
  const orderBy = {};
  orderBy[sort_by] = order;

  // Fetch beds and count
  const [beds, total] = await Promise.all([
    bedRepository.findMany(repoFilters, skip, limit, orderBy),
    bedRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    beds,
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
 * Get bed by ID
 *
 * @param {string} id - Bed ID
 * @returns {Promise<Object>} Bed data
 */
const getBedById = async (id) => {
  const bed = await bedRepository.findById(id);
  
  if (!bed) {
    throw new HttpError('errors.bed.not_found', 404);
  }

  return bed;
};

/**
 * Create new bed
 *
 * @param {Object} data - Bed data
 * @param {string} data.tenant_id - Tenant ID
 * @param {string} data.facility_id - Facility ID
 * @param {string} data.ward_id - Ward ID
 * @param {string} [data.room_id] - Room ID
 * @param {string} data.label - Bed label
 * @param {string} data.status - Bed status
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Created bed
 */
const createBed = async (data, context = {}) => {
  // Create bed
  const bed = await bedRepository.create(data);

  // Create audit log
  await createAuditLog({
    action: 'BED_CREATED',
    entity: 'bed',
    entity_id: bed.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      tenant_id: bed.tenant_id,
      facility_id: bed.facility_id,
      ward_id: bed.ward_id,
      room_id: bed.room_id,
      label: bed.label,
      status: bed.status
    }
  });

  return bed;
};

/**
 * Update bed
 *
 * @param {string} id - Bed ID
 * @param {Object} data - Update data
 * @param {string} [data.facility_id] - Facility ID
 * @param {string} [data.ward_id] - Ward ID
 * @param {string} [data.room_id] - Room ID
 * @param {string} [data.label] - Bed label
 * @param {string} [data.status] - Bed status
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Updated bed
 */
const updateBed = async (id, data, context = {}) => {
  // Check if bed exists and get before state
  const beforeBed = await bedRepository.findById(id);
  
  if (!beforeBed) {
    throw new HttpError('errors.bed.not_found', 404);
  }

  // Update bed
  const bed = await bedRepository.update(id, data);

  // Create audit log
  await createAuditLog({
    action: 'BED_UPDATED',
    entity: 'bed',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      before: {
        facility_id: beforeBed.facility_id,
        ward_id: beforeBed.ward_id,
        room_id: beforeBed.room_id,
        label: beforeBed.label,
        status: beforeBed.status
      },
      after: {
        facility_id: bed.facility_id,
        ward_id: bed.ward_id,
        room_id: bed.room_id,
        label: bed.label,
        status: bed.status
      }
    }
  });

  return bed;
};

/**
 * Delete bed (soft delete)
 *
 * @param {string} id - Bed ID
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<void>}
 */
const deleteBed = async (id, context = {}) => {
  // Check if bed exists
  const bed = await bedRepository.findById(id);
  
  if (!bed) {
    throw new HttpError('errors.bed.not_found', 404);
  }

  // Soft delete bed
  await bedRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    action: 'BED_DELETED',
    entity: 'bed',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      tenant_id: bed.tenant_id,
      facility_id: bed.facility_id,
      ward_id: bed.ward_id,
      room_id: bed.room_id,
      label: bed.label,
      status: bed.status
    }
  });
};

module.exports = {
  listBeds,
  getBedById,
  createBed,
  updateBed,
  deleteBed
};
