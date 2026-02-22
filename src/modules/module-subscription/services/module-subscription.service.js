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

const PLAN_TIER_ORDER = ['FREE', 'BASIC', 'PRO', 'ADVANCED', 'CUSTOM'];

const normalizeTierCode = (tierCode) => {
  const normalized = String(tierCode || '').trim().toUpperCase();
  return PLAN_TIER_ORDER.includes(normalized) ? normalized : null;
};

const tierMeetsMinimum = (tierCode, minimumTier) => {
  const currentIndex = PLAN_TIER_ORDER.indexOf(normalizeTierCode(tierCode));
  const minimumIndex = PLAN_TIER_ORDER.indexOf(normalizeTierCode(minimumTier));
  if (currentIndex === -1 || minimumIndex === -1) {
    return false;
  }
  return currentIndex >= minimumIndex;
};

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
  }).catch(() => {});

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
  }).catch(() => {});

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
  }).catch(() => {});

  return deletedModuleSubscription;
};

/**
 * Activate module subscription
 *
 * @param {string} id - Module subscription ID
 * @param {Object} data - Activation payload
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Updated module subscription
 */
const activateModuleSubscription = async (id, data = {}, context = {}) => {
  const before = await moduleSubscriptionRepository.findById(id);

  if (!before) {
    throw new HttpError('errors.module_subscription.not_found', 404);
  }

  const updated = await moduleSubscriptionRepository.update(id, {
    is_active: true,
    entitlement_denied: false,
    entitlement_denial_reason: null,
    activation_requested_at: new Date(),
    activated_at: new Date(),
    deactivated_at: null
  });

  createAuditLog({
    user_id: context.user?.id,
    action: 'ACTIVATE',
    entity: 'module_subscription',
    entity_id: updated.id,
    diff_json: {
      before,
      after: updated,
      metadata: {
        reason: data.reason || null
      }
    },
    ip_address: context.ip,
    tenant_id: context.tenant_id
  }).catch(() => {});

  return updated;
};

/**
 * Deactivate module subscription
 *
 * @param {string} id - Module subscription ID
 * @param {Object} data - Deactivation payload
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Updated module subscription
 */
const deactivateModuleSubscription = async (id, data = {}, context = {}) => {
  const before = await moduleSubscriptionRepository.findById(id);

  if (!before) {
    throw new HttpError('errors.module_subscription.not_found', 404);
  }

  const updated = await moduleSubscriptionRepository.update(id, {
    is_active: false,
    deactivated_at: new Date()
  });

  createAuditLog({
    user_id: context.user?.id,
    action: 'DEACTIVATE',
    entity: 'module_subscription',
    entity_id: updated.id,
    diff_json: {
      before,
      after: updated,
      metadata: {
        reason: data.reason || null
      }
    },
    ip_address: context.ip,
    tenant_id: context.tenant_id
  }).catch(() => {});

  return updated;
};

/**
 * Evaluate module eligibility against plan tier and add-on rules
 *
 * @param {string} id - Module subscription ID
 * @param {Object} context - Request context
 * @returns {Promise<Object>} Eligibility payload
 */
const checkModuleSubscriptionEligibility = async (id, context = {}) => {
  const moduleSubscription = await moduleSubscriptionRepository.findById(id);

  if (!moduleSubscription) {
    throw new HttpError('errors.module_subscription.not_found', 404);
  }

  const moduleTier = normalizeTierCode(moduleSubscription.module?.minimum_plan_tier_code);
  const planTier = normalizeTierCode(moduleSubscription.subscription?.plan?.tier_code);

  let eligible = true;
  let reason = null;

  if (moduleTier && planTier) {
    eligible = tierMeetsMinimum(planTier, moduleTier);
    if (!eligible) {
      reason = `requires_${moduleTier}`;
    }
  }

  const updated = await moduleSubscriptionRepository.update(id, {
    entitlement_denied: !eligible,
    entitlement_denial_reason: reason,
    eligibility_checked_at: new Date(),
    evaluated_plan_fit_status: moduleSubscription.subscription?.plan_fit_status || null
  });

  createAuditLog({
    user_id: context.user?.id,
    action: 'ELIGIBILITY_CHECK',
    entity: 'module_subscription',
    entity_id: updated.id,
    diff_json: {
      before: moduleSubscription,
      after: updated,
      metadata: {
        module_minimum_tier: moduleTier,
        subscription_plan_tier: planTier,
        eligible,
        reason
      }
    },
    ip_address: context.ip,
    tenant_id: context.tenant_id
  }).catch(() => {});

  return {
    module_subscription_id: updated.id,
    eligible,
    reason,
    module_minimum_tier: moduleTier,
    subscription_plan_tier: planTier,
    checked_at: updated.eligibility_checked_at
  };
};

module.exports = {
  listModuleSubscriptions,
  getModuleSubscriptionById,
  createModuleSubscription,
  updateModuleSubscription,
  deleteModuleSubscription,
  activateModuleSubscription,
  deactivateModuleSubscription,
  checkModuleSubscriptionEligibility
};



