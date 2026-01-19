/**
 * Module subscription service
 *
 * @module modules/module-subscription/services
 * @description Business logic for module subscription operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const moduleSubscriptionRepository = require('@repositories/module-subscription/module-subscription.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List module subscriptions with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.module_id] - Filter by module ID
 * @param {string} [filters.subscription_id] - Filter by subscription ID
 * @param {boolean} [filters.is_active] - Filter by active status
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated module subscriptions
 */
const listModuleSubscriptions = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  // Build repository filters
  const repoFilters = {};

  if (filters.module_id) {
    repoFilters.module_id = filters.module_id;
  }

  if (filters.subscription_id) {
    repoFilters.subscription_id = filters.subscription_id;
  }

  if (filters.is_active !== undefined) {
    repoFilters.is_active = filters.is_active === true || filters.is_active === 'true';
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort order
  const orderBy = {};
  orderBy[sort_by] = order;

  // Fetch module subscriptions and count
  const [moduleSubscriptions, total] = await Promise.all([
    moduleSubscriptionRepository.findMany(repoFilters, skip, limit, orderBy),
    moduleSubscriptionRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    module_subscriptions: moduleSubscriptions,
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
 * Get module subscription by ID
 *
 * @param {string} id - Module subscription ID
 * @returns {Promise<Object>} Module subscription data
 */
const getModuleSubscriptionById = async (id) => {
  const moduleSubscription = await moduleSubscriptionRepository.findById(id);

  if (!moduleSubscription) {
    throw new HttpError('errors.module_subscription.not_found', 404);
  }

  return moduleSubscription;
};

/**
 * Create new module subscription
 * Per module-creation.mdc: All mutations must call createAuditLog
 *
 * @param {Object} data - Module subscription data
 * @param {Object} context - Request context (user, ip, tenant)
 * @returns {Promise<Object>} Created module subscription
 */
const createModuleSubscription = async (data, context) => {
  const moduleSubscription = await moduleSubscriptionRepository.create(data);

  // Audit log (non-blocking, per module-creation.mdc)
  createAuditLog({
    user_id: context.user?.id,
    action: 'CREATE',
    entity: 'module_subscription',
    entity_id: moduleSubscription.id,
    diff_json: { after: moduleSubscription },
    ip_address: context.ip,
    tenant_id: context.tenant_id
  }).catch(err => {
    // Log error but don't throw (per error-logging.mdc)
    console.error('Audit log failed:', err);
  });

  return moduleSubscription;
};

/**
 * Update module subscription
 * Per module-creation.mdc: All mutations must call createAuditLog
 *
 * @param {string} id - Module subscription ID
 * @param {Object} data - Update data
 * @param {Object} context - Request context (user, ip, tenant)
 * @returns {Promise<Object>} Updated module subscription
 */
const updateModuleSubscription = async (id, data, context) => {
  // Get existing module subscription for audit diff
  const existingModuleSubscription = await moduleSubscriptionRepository.findById(id);

  if (!existingModuleSubscription) {
    throw new HttpError('errors.module_subscription.not_found', 404);
  }

  const updatedModuleSubscription = await moduleSubscriptionRepository.update(id, data);

  // Audit log (non-blocking, per module-creation.mdc)
  createAuditLog({
    user_id: context.user?.id,
    action: 'UPDATE',
    entity: 'module_subscription',
    entity_id: updatedModuleSubscription.id,
    diff_json: { before: existingModuleSubscription, after: updatedModuleSubscription },
    ip_address: context.ip,
    tenant_id: context.tenant_id
  }).catch(err => {
    // Log error but don't throw (per error-logging.mdc)
    console.error('Audit log failed:', err);
  });

  return updatedModuleSubscription;
};

/**
 * Soft delete module subscription
 * Per module-creation.mdc: All mutations must call createAuditLog
 * Per prisma.mdc: Only soft deletes allowed
 *
 * @param {string} id - Module subscription ID
 * @param {Object} context - Request context (user, ip, tenant)
 * @returns {Promise<Object>} Deleted module subscription
 */
const deleteModuleSubscription = async (id, context) => {
  // Get existing module subscription for audit
  const existingModuleSubscription = await moduleSubscriptionRepository.findById(id);

  if (!existingModuleSubscription) {
    throw new HttpError('errors.module_subscription.not_found', 404);
  }

  const deletedModuleSubscription = await moduleSubscriptionRepository.softDelete(id);

  // Audit log (non-blocking, per module-creation.mdc)
  createAuditLog({
    user_id: context.user?.id,
    action: 'DELETE',
    entity: 'module_subscription',
    entity_id: deletedModuleSubscription.id,
    diff_json: { before: existingModuleSubscription },
    ip_address: context.ip,
    tenant_id: context.tenant_id
  }).catch(err => {
    // Log error but don't throw (per error-logging.mdc)
    console.error('Audit log failed:', err);
  });

  return deletedModuleSubscription;
};

module.exports = {
  listModuleSubscriptions,
  getModuleSubscriptionById,
  createModuleSubscription,
  updateModuleSubscription,
  deleteModuleSubscription
};
