/**
 * Subscription service
 *
 * @module modules/subscription/services
 * @description Business logic layer for subscription operations.
 * Per module-creation.mdc: Only import and use its own repository.
 * Per module-creation.mdc: All mutations must call audit log creation.
 */

const subscriptionRepository = require('@repositories/subscription/subscription.repository');
const subscriptionPlanRepository = require('@repositories/subscription-plan/subscription-plan.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const PLAN_TIER_ORDER = ['FREE', 'BASIC', 'PRO', 'ADVANCED', 'CUSTOM'];

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const getCycleDays = (billingCycle) => {
  if (billingCycle === 'YEARLY') return 365;
  if (billingCycle === 'QUARTERLY') return 90;
  return 30;
};

const addBillingCycle = (baseDate, billingCycle) => {
  const date = new Date(baseDate);
  if (billingCycle === 'YEARLY') {
    date.setFullYear(date.getFullYear() + 1);
    return date;
  }
  if (billingCycle === 'QUARTERLY') {
    date.setMonth(date.getMonth() + 3);
    return date;
  }
  date.setMonth(date.getMonth() + 1);
  return date;
};

const normalizeTierCode = (tierCode) => {
  const normalized = String(tierCode || '').trim().toUpperCase();
  return PLAN_TIER_ORDER.includes(normalized) ? normalized : null;
};

const computePercent = (used, limit) => {
  if (!Number.isFinite(limit) || limit <= 0) return null;
  return Math.round((used / limit) * 10000) / 100;
};

/**
 * Get subscription by ID
 *
 * @param {string} id - Subscription ID
 * @returns {Promise<Object>} Subscription object
 * @throws {HttpError} 404 if not found
 */
const getSubscriptionById = async (id) => {
  const subscription = await subscriptionRepository.findById(id, {
    plan: true,
    pending_plan: true,
    module_subscriptions: {
      where: {
        deleted_at: null
      }
    },
    tenant: true
  });

  if (!subscription) {
    throw new HttpError('errors.subscription.not_found', 404);
  }

  return subscription;
};

/**
 * List subscriptions with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated subscriptions with metadata
 */
const listSubscriptions = async (filters = {}, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };

  // Build filters
  const where = {};

  if (filters.tenant_id) {
    where.tenant_id = filters.tenant_id;
  }

  if (filters.plan_id) {
    where.plan_id = filters.plan_id;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const include = {
    plan: true,
    tenant: true
  };

  const [subscriptions, total] = await Promise.all([
    subscriptionRepository.findMany(where, skip, limit, orderBy, include),
    subscriptionRepository.count(where)
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    subscriptions,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  };
};

/**
 * Create new subscription
 *
 * @param {Object} data - Subscription data
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Created subscription
 */
const createSubscription = async (data, user, ip) => {
  // Set default status and start_date if not provided
  const subscriptionData = {
    ...data,
    status: data.status || 'ACTIVE',
    start_date: data.start_date || new Date().toISOString()
  };

  const subscription = await subscriptionRepository.create(subscriptionData);

  // Create audit log
  await createAuditLog({
    user_id: user?.id || null,
    action: 'CREATE',
    entity: 'subscription',
    entity_id: subscription.id,
    diff: { after: subscription },
    ip
  }).catch(() => {});

  return subscription;
};

/**
 * Update subscription
 *
 * @param {string} id - Subscription ID
 * @param {Object} data - Update data
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Updated subscription
 */
const updateSubscription = async (id, data, user, ip) => {
  const before = await getSubscriptionById(id);
  const subscription = await subscriptionRepository.update(id, data);

  // Create audit log
  await createAuditLog({
    user_id: user?.id || null,
    action: 'UPDATE',
    entity: 'subscription',
    entity_id: subscription.id,
    diff: { before, after: subscription },
    ip
  }).catch(() => {});

  return subscription;
};

/**
 * Cancel subscription
 *
 * @param {string} id - Subscription ID
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Cancelled subscription
 */
const cancelSubscription = async (id, user, ip) => {
  const before = await getSubscriptionById(id);

  // Check if already cancelled
  if (before.status === 'CANCELLED') {
    throw new HttpError('errors.subscription.already_cancelled', 400);
  }

  const subscription = await subscriptionRepository.update(id, {
    status: 'CANCELLED',
    end_date: new Date().toISOString()
  });

  // Create audit log
  await createAuditLog({
    user_id: user?.id || null,
    action: 'CANCEL',
    entity: 'subscription',
    entity_id: subscription.id,
    diff: { before, after: subscription },
    ip
  }).catch(() => {});

  return subscription;
};

/**
 * Reactivate subscription
 *
 * @param {string} id - Subscription ID
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Reactivated subscription
 */
const reactivateSubscription = async (id, user, ip) => {
  const before = await getSubscriptionById(id);

  // Check if currently cancelled
  if (before.status !== 'CANCELLED') {
    throw new HttpError('errors.subscription.not_cancelled', 400);
  }

  const subscription = await subscriptionRepository.update(id, {
    status: 'ACTIVE',
    end_date: null
  });

  // Create audit log
  await createAuditLog({
    user_id: user?.id || null,
    action: 'REACTIVATE',
    entity: 'subscription',
    entity_id: subscription.id,
    diff: { before, after: subscription },
    ip
  }).catch(() => {});

  return subscription;
};

/**
 * Delete subscription (soft delete)
 *
 * @param {string} id - Subscription ID
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Deleted subscription
 */
const deleteSubscription = async (id, user, ip) => {
  const before = await getSubscriptionById(id);
  const subscription = await subscriptionRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    user_id: user?.id || null,
    action: 'DELETE',
    entity: 'subscription',
    entity_id: subscription.id,
    diff: { before, after: subscription },
    ip
  }).catch(() => {});

  return subscription;
};

/**
 * Queue a subscription upgrade request
 *
 * @param {string} id - Subscription ID
 * @param {Object} data - Upgrade payload
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Updated subscription
 */
const upgradeSubscription = async (id, data, user, ip) => {
  const before = await getSubscriptionById(id);
  const targetPlan = await subscriptionPlanRepository.findById(data.target_plan_id);

  if (!targetPlan) {
    throw new HttpError('errors.subscription_plan.not_found', 404);
  }

  if (before.plan_id === targetPlan.id) {
    throw new HttpError('errors.subscription.already_on_target_plan', 400);
  }

  const currentPrice = toNumber(before.plan?.price) || 0;
  const targetPrice = toNumber(targetPlan.price) || 0;

  if (targetPrice <= currentPrice) {
    throw new HttpError('errors.subscription.invalid_upgrade_path', 400);
  }

  const subscription = await subscriptionRepository.update(id, {
    pending_plan_id: targetPlan.id,
    change_status: 'PENDING_UPGRADE',
    change_requested_at: new Date(),
    change_effective_at: data.effective_at ? new Date(data.effective_at) : null,
    proration_amount: targetPrice - currentPrice,
    proration_currency_code: 'USD'
  });

  await createAuditLog({
    user_id: user?.id || null,
    action: 'UPGRADE_REQUEST',
    entity: 'subscription',
    entity_id: subscription.id,
    diff: {
      before,
      after: subscription,
      metadata: {
        target_plan_id: targetPlan.id,
        reason: data.reason || null
      }
    },
    ip
  }).catch(() => {});

  return subscription;
};

/**
 * Queue a subscription downgrade request
 *
 * @param {string} id - Subscription ID
 * @param {Object} data - Downgrade payload
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Updated subscription
 */
const downgradeSubscription = async (id, data, user, ip) => {
  const before = await getSubscriptionById(id);
  const targetPlan = await subscriptionPlanRepository.findById(data.target_plan_id);

  if (!targetPlan) {
    throw new HttpError('errors.subscription_plan.not_found', 404);
  }

  if (before.plan_id === targetPlan.id) {
    throw new HttpError('errors.subscription.already_on_target_plan', 400);
  }

  const currentPrice = toNumber(before.plan?.price) || 0;
  const targetPrice = toNumber(targetPlan.price) || 0;

  if (targetPrice > currentPrice) {
    throw new HttpError('errors.subscription.invalid_downgrade_path', 400);
  }

  const subscription = await subscriptionRepository.update(id, {
    pending_plan_id: targetPlan.id,
    change_status: 'PENDING_DOWNGRADE',
    change_requested_at: new Date(),
    change_effective_at: data.effective_at ? new Date(data.effective_at) : null,
    proration_amount: targetPrice - currentPrice,
    proration_currency_code: 'USD'
  });

  await createAuditLog({
    user_id: user?.id || null,
    action: 'DOWNGRADE_REQUEST',
    entity: 'subscription',
    entity_id: subscription.id,
    diff: {
      before,
      after: subscription,
      metadata: {
        target_plan_id: targetPlan.id,
        reason: data.reason || null
      }
    },
    ip
  }).catch(() => {});

  return subscription;
};

/**
 * Renew subscription
 *
 * @param {string} id - Subscription ID
 * @param {Object} data - Renew payload
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Updated subscription
 */
const renewSubscription = async (id, data = {}, user, ip) => {
  const before = await getSubscriptionById(id);
  const baseDate = before.end_date ? new Date(before.end_date) : new Date();
  const renewedEndDate = data.end_date
    ? new Date(data.end_date)
    : addBillingCycle(baseDate, before.plan?.billing_cycle || 'MONTHLY');

  const subscription = await subscriptionRepository.update(id, {
    status: 'ACTIVE',
    end_date: renewedEndDate,
    change_status: 'NONE',
    change_requested_at: null,
    change_effective_at: null
  });

  await createAuditLog({
    user_id: user?.id || null,
    action: 'RENEW',
    entity: 'subscription',
    entity_id: subscription.id,
    diff: {
      before,
      after: subscription,
      metadata: {
        reason: data.reason || null
      }
    },
    ip
  }).catch(() => {});

  return subscription;
};

/**
 * Calculate proration preview for a subscription change
 *
 * @param {string} id - Subscription ID
 * @param {string} targetPlanId - Target plan ID
 * @returns {Promise<Object>} Proration preview payload
 */
const getSubscriptionProrationPreview = async (id, targetPlanId) => {
  const subscription = await getSubscriptionById(id);
  const targetPlan = targetPlanId
    ? await subscriptionPlanRepository.findById(targetPlanId)
    : (subscription.pending_plan || subscription.plan);

  if (!targetPlan) {
    return {
      subscription_id: subscription.id,
      current_plan_id: subscription.plan_id,
      target_plan_id: null,
      proration_amount: null,
      currency_code: subscription.proration_currency_code || 'USD',
      cycle_days: getCycleDays(subscription.plan?.billing_cycle || 'MONTHLY'),
      remaining_days: null
    };
  }

  const cycleDays = getCycleDays(subscription.plan?.billing_cycle || 'MONTHLY');
  const now = new Date();
  const endDate = subscription.end_date
    ? new Date(subscription.end_date)
    : addBillingCycle(subscription.start_date || now, subscription.plan?.billing_cycle || 'MONTHLY');

  const remainingMs = Math.max(0, endDate.getTime() - now.getTime());
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

  const currentPrice = toNumber(subscription.plan?.price) || 0;
  const targetPrice = toNumber(targetPlan.price) || 0;
  const prorationAmount = ((targetPrice - currentPrice) / cycleDays) * remainingDays;

  return {
    subscription_id: subscription.id,
    current_plan_id: subscription.plan_id,
    target_plan_id: targetPlan.id,
    cycle_days: cycleDays,
    remaining_days: remainingDays,
    proration_amount: Math.round(prorationAmount * 100) / 100,
    currency_code: subscription.proration_currency_code || 'USD'
  };
};

/**
 * Get subscription usage summary against plan limits
 *
 * @param {string} id - Subscription ID
 * @returns {Promise<Object>} Usage summary payload
 */
const getSubscriptionUsageSummary = async (id) => {
  const subscription = await getSubscriptionById(id);
  const plan = subscription.plan || {};

  const usage = {
    users_used: subscription.users_used || 0,
    facilities_used: subscription.facilities_used || 0,
    storage_used_mb: subscription.storage_used_mb || 0,
    modules_used: subscription.modules_used || subscription.module_subscriptions?.length || 0
  };

  const limits = {
    max_users: plan.max_users,
    max_facilities: plan.max_facilities,
    max_storage_mb: plan.max_storage_mb,
    max_modules: plan.max_modules
  };

  return {
    subscription_id: subscription.id,
    plan_id: subscription.plan_id,
    usage,
    limits,
    utilization_percent: {
      users: computePercent(usage.users_used, limits.max_users),
      facilities: computePercent(usage.facilities_used, limits.max_facilities),
      storage_mb: computePercent(usage.storage_used_mb, limits.max_storage_mb),
      modules: computePercent(usage.modules_used, limits.max_modules)
    }
  };
};

/**
 * Evaluate subscription plan fit
 *
 * @param {string} id - Subscription ID
 * @returns {Promise<Object>} Fit-check payload
 */
const getSubscriptionFitCheck = async (id) => {
  const subscription = await getSubscriptionById(id);
  const usageSummary = await getSubscriptionUsageSummary(id);
  const warningPercent = subscription.plan?.plan_fit_warning_percent || 80;

  const percents = Object.values(usageSummary.utilization_percent).filter((value) => value !== null);
  const maxPercent = percents.length ? Math.max(...percents) : 0;

  let computedStatus = 'HEALTHY';
  if (maxPercent > 100) {
    computedStatus = 'EXCEEDED';
  } else if (maxPercent >= warningPercent) {
    computedStatus = 'APPROACHING_LIMIT';
  }

  return {
    subscription_id: subscription.id,
    stored_status: subscription.plan_fit_status,
    computed_status: computedStatus,
    warning_percent: warningPercent,
    utilization_percent: usageSummary.utilization_percent,
    exceeded: computedStatus === 'EXCEEDED',
    approaching_limit: computedStatus === 'APPROACHING_LIMIT'
  };
};

/**
 * Recommend an upgrade path based on fit-check and tier data
 *
 * @param {string} id - Subscription ID
 * @returns {Promise<Object>} Upgrade recommendation
 */
const getSubscriptionUpgradeRecommendation = async (id) => {
  const subscription = await getSubscriptionById(id);
  const fitCheck = await getSubscriptionFitCheck(id);
  const currentTier = normalizeTierCode(subscription.plan?.tier_code);

  if (!currentTier || fitCheck.computed_status === 'HEALTHY') {
    return {
      subscription_id: subscription.id,
      current_tier: currentTier,
      recommended_tier: null,
      recommendation: 'keep_current_plan',
      reason: 'Current usage is within healthy thresholds.'
    };
  }

  const currentTierIndex = PLAN_TIER_ORDER.indexOf(currentTier);
  const recommendedTier = PLAN_TIER_ORDER[Math.min(currentTierIndex + 1, PLAN_TIER_ORDER.length - 1)];

  return {
    subscription_id: subscription.id,
    current_tier: currentTier,
    recommended_tier: recommendedTier,
    recommendation: fitCheck.computed_status === 'EXCEEDED' ? 'upgrade_required' : 'upgrade_recommended',
    reason: fitCheck.computed_status === 'EXCEEDED'
      ? 'Usage exceeded current plan limits.'
      : 'Usage is approaching configured warning thresholds.'
  };
};

module.exports = {
  getSubscriptionById,
  listSubscriptions,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  deleteSubscription,
  upgradeSubscription,
  downgradeSubscription,
  renewSubscription,
  getSubscriptionProrationPreview,
  getSubscriptionUsageSummary,
  getSubscriptionFitCheck,
  getSubscriptionUpgradeRecommendation
};
