/**
 * Tenant service
 *
 * @module modules/tenant/services
 * @description Business logic for tenant operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const tenantRepository = require('@repositories/tenant/tenant.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } = require('@config/constants');

const toPositiveInt = (value, fallback, max = Number.POSITIVE_INFINITY) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.trunc(parsed);
  if (normalized <= 0) return fallback;
  return Math.min(normalized, max);
};

const normalizeSortOrder = (value) => {
  const normalized = String(value || 'desc').toLowerCase();
  return normalized === 'asc' ? 'asc' : 'desc';
};

/**
 * List tenants with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {boolean} [filters.is_active] - Filter by active status
 * @param {string} [filters.search] - Search by name or slug
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated tenants
 */
const listTenants = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  const resolvedPage = toPositiveInt(page, DEFAULT_PAGE);
  const resolvedLimit = toPositiveInt(limit, DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
  const resolvedSortBy = typeof sort_by === 'string' && sort_by.trim()
    ? sort_by.trim()
    : 'created_at';
  const resolvedOrder = normalizeSortOrder(order);

  // Build repository filters
  const repoFilters = {};

  if (filters.is_active !== undefined) {
    repoFilters.is_active = filters.is_active === true || filters.is_active === 'true';
  }

  // Handle search filter
  if (filters.search) {
    repoFilters.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { slug: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  // Calculate pagination
  const skip = (resolvedPage - 1) * resolvedLimit;

  // Build sort order
  const orderBy = {};
  orderBy[resolvedSortBy] = resolvedOrder;

  // Fetch tenants and count
  const [tenants, total] = await Promise.all([
    tenantRepository.findMany(repoFilters, skip, resolvedLimit, orderBy),
    tenantRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / resolvedLimit);
  const hasNextPage = resolvedPage < totalPages;
  const hasPreviousPage = resolvedPage > 1;

  return {
    tenants,
    pagination: {
      page: resolvedPage,
      limit: resolvedLimit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage
    }
  };
};

/**
 * Get tenant by ID
 *
 * @param {string} id - Tenant ID
 * @returns {Promise<Object>} Tenant data
 */
const getTenantById = async (id) => {
  const tenant = await tenantRepository.findById(id);
  
  if (!tenant) {
    throw new HttpError('errors.tenant.not_found', 404);
  }

  return tenant;
};

/**
 * Create new tenant
 *
 * @param {Object} data - Tenant data
 * @param {string} data.name - Tenant name
 * @param {string} [data.slug] - Tenant slug
 * @param {boolean} [data.is_active] - Active status
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Created tenant
 */
const createTenant = async (data, context = {}) => {
  // Create tenant
  const tenant = await tenantRepository.create(data);

  // Create audit log
  await createAuditLog({
    action: 'TENANT_CREATED',
    entity: 'tenant',
    entity_id: tenant.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      name: tenant.name,
      slug: tenant.slug,
      is_active: tenant.is_active
    }
  });

  return tenant;
};

/**
 * Update tenant
 *
 * @param {string} id - Tenant ID
 * @param {Object} data - Update data
 * @param {string} [data.name] - Tenant name
 * @param {string} [data.slug] - Tenant slug
 * @param {boolean} [data.is_active] - Active status
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Updated tenant
 */
const updateTenant = async (id, data, context = {}) => {
  // Check if tenant exists and get before state
  const beforeTenant = await tenantRepository.findById(id);
  
  if (!beforeTenant) {
    throw new HttpError('errors.tenant.not_found', 404);
  }

  // Update tenant
  const tenant = await tenantRepository.update(id, data);

  // Create audit log
  await createAuditLog({
    action: 'TENANT_UPDATED',
    entity: 'tenant',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      before: {
        name: beforeTenant.name,
        slug: beforeTenant.slug,
        is_active: beforeTenant.is_active
      },
      after: {
        name: tenant.name,
        slug: tenant.slug,
        is_active: tenant.is_active
      }
    }
  });

  return tenant;
};

/**
 * Delete tenant (soft delete)
 *
 * @param {string} id - Tenant ID
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<void>}
 */
const deleteTenant = async (id, context = {}) => {
  // Check if tenant exists
  const tenant = await tenantRepository.findById(id);
  
  if (!tenant) {
    throw new HttpError('errors.tenant.not_found', 404);
  }

  // Soft delete tenant
  await tenantRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    action: 'TENANT_DELETED',
    entity: 'tenant',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      name: tenant.name,
      slug: tenant.slug
    }
  });
};

module.exports = {
  listTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant
};
