/**
 * Module service
 *
 * @module modules/module/services
 * @description Business logic for module operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const moduleRepository = require('@repositories/module/module.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List modules with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.search] - Search by name or description
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated modules
 */
const listModules = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  // Build repository filters
  const repoFilters = {};

  // Handle search filter
  if (filters.search) {
    repoFilters.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort order
  const orderBy = {};
  orderBy[sort_by] = order;

  // Fetch modules and count
  const [modules, total] = await Promise.all([
    moduleRepository.findMany(repoFilters, skip, limit, orderBy),
    moduleRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    modules,
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
 * Get module by ID
 *
 * @param {string} id - Module ID
 * @returns {Promise<Object>} Module data
 */
const getModuleById = async (id) => {
  const module = await moduleRepository.findById(id);

  if (!module) {
    throw new HttpError('errors.module.not_found', 404);
  }

  return module;
};

/**
 * Create new module
 * Per module-creation.mdc: All mutations must call createAuditLog
 *
 * @param {Object} data - Module data
 * @param {Object} context - Request context (user, ip, tenant)
 * @returns {Promise<Object>} Created module
 */
const createModule = async (data, context) => {
  const module = await moduleRepository.create(data);

  // Audit log (non-blocking, per module-creation.mdc)
  createAuditLog({
    user_id: context.user?.id,
    action: 'CREATE',
    entity: 'module',
    entity_id: module.id,
    diff_json: { after: module },
    ip_address: context.ip,
    tenant_id: context.tenant_id
  }).catch(err => {
    // Log error but don't throw (per error-logging.mdc)
    console.error('Audit log failed:', err);
  });

  return module;
};

/**
 * Update module
 * Per module-creation.mdc: All mutations must call createAuditLog
 *
 * @param {string} id - Module ID
 * @param {Object} data - Update data
 * @param {Object} context - Request context (user, ip, tenant)
 * @returns {Promise<Object>} Updated module
 */
const updateModule = async (id, data, context) => {
  // Get existing module for audit diff
  const existingModule = await moduleRepository.findById(id);

  if (!existingModule) {
    throw new HttpError('errors.module.not_found', 404);
  }

  const updatedModule = await moduleRepository.update(id, data);

  // Audit log (non-blocking, per module-creation.mdc)
  createAuditLog({
    user_id: context.user?.id,
    action: 'UPDATE',
    entity: 'module',
    entity_id: updatedModule.id,
    diff_json: { before: existingModule, after: updatedModule },
    ip_address: context.ip,
    tenant_id: context.tenant_id
  }).catch(err => {
    // Log error but don't throw (per error-logging.mdc)
    console.error('Audit log failed:', err);
  });

  return updatedModule;
};

/**
 * Soft delete module
 * Per module-creation.mdc: All mutations must call createAuditLog
 * Per prisma.mdc: Only soft deletes allowed
 *
 * @param {string} id - Module ID
 * @param {Object} context - Request context (user, ip, tenant)
 * @returns {Promise<Object>} Deleted module
 */
const deleteModule = async (id, context) => {
  // Get existing module for audit
  const existingModule = await moduleRepository.findById(id);

  if (!existingModule) {
    throw new HttpError('errors.module.not_found', 404);
  }

  const deletedModule = await moduleRepository.softDelete(id);

  // Audit log (non-blocking, per module-creation.mdc)
  createAuditLog({
    user_id: context.user?.id,
    action: 'DELETE',
    entity: 'module',
    entity_id: deletedModule.id,
    diff_json: { before: existingModule },
    ip_address: context.ip,
    tenant_id: context.tenant_id
  }).catch(err => {
    // Log error but don't throw (per error-logging.mdc)
    console.error('Audit log failed:', err);
  });

  return deletedModule;
};

module.exports = {
  listModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule
};
