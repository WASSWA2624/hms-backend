/**
 * Subscription Plan service
 *
 * @module modules/subscription-plan/services
 * @description Business logic layer for subscription plan operations.
 * Per module-creation.mdc: Only import and use its own repository.
 * Per module-creation.mdc: All mutations must call audit log creation.
 */

const subscriptionPlanRepository = require('@repositories/subscription-plan/subscription-plan.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const PLAN_TIER_ORDER = ['FREE', 'BASIC', 'PRO', 'ADVANCED', 'CUSTOM'];

const TIER_BASE_ENTITLEMENTS = {
  FREE: ['group_1', 'group_2_basic', 'group_3_basic', 'group_4_basic', 'group_13_basic', 'group_17_view_only', 'group_15_fault_reporting'],
  BASIC: ['group_1', 'group_2', 'group_3', 'group_4', 'group_13_core', 'group_16', 'group_17_basic', 'group_15_foundation'],
  PRO: ['group_1_to_20_core', 'group_15A_add_on_eligible'],
  ADVANCED: ['group_1_to_20_core', 'on_prem_standard_package', 'all_standard_add_ons'],
  CUSTOM: ['group_1_to_20_core', 'all_standard_add_ons', 'bespoke_contract_scope']
};

const ADD_ONS = [
  { code: 'inventory_procurement_lite', name: 'Inventory and Procurement Lite', minimum_tier: 'BASIC', price_range: '$19-$59/mo' },
  { code: 'biomedical_engineering_suite', name: 'Biomedical Engineering Suite', minimum_tier: 'PRO', price_range: '$49-$199/mo' },
  { code: 'compliance_audit_suite', name: 'Compliance and Audit Suite', minimum_tier: 'PRO', price_range: '$39-$149/mo' },
  { code: 'advanced_analytics', name: 'Advanced Analytics', minimum_tier: 'PRO', price_range: '$29-$99/mo' },
  { code: 'integrations_webhooks_pack', name: 'Integrations/Webhooks Pack', minimum_tier: 'PRO', price_range: '$49-$149/mo' },
  { code: 'extra_storage', name: 'Extra Storage', minimum_tier: 'BASIC', price_range: '$5 / 10GB' },
  { code: 'sms_credits', name: 'SMS Credits', minimum_tier: 'BASIC', price_range: 'usage-based' }
];

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
 * Get subscription plan by ID
 *
 * @param {string} id - Subscription Plan ID
 * @returns {Promise<Object>} Subscription Plan object
 * @throws {HttpError} 404 if not found
 */
const getSubscriptionPlanById = async (id) => {
  const subscriptionPlan = await subscriptionPlanRepository.findById(id);

  if (!subscriptionPlan) {
    throw new HttpError('errors.subscription_plan.not_found', 404);
  }

  return subscriptionPlan;
};

/**
 * List subscription plans with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated subscription plans with metadata
 */
const listSubscriptionPlans = async (filters = {}, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };

  // Build filters
  const where = {};

  if (filters.tenant_id) {
    where.tenant_id = filters.tenant_id;
  }

  if (filters.billing_cycle) {
    where.billing_cycle = filters.billing_cycle;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  if (filters.name) {
    where.name = { contains: filters.name, mode: 'insensitive' };
  }

  const [subscriptionPlans, total] = await Promise.all([
    subscriptionPlanRepository.findMany(where, skip, limit, orderBy),
    subscriptionPlanRepository.count(where)
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    subscriptionPlans,
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
 * Create new subscription plan
 *
 * @param {Object} data - Subscription Plan data
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Created subscription plan
 */
const createSubscriptionPlan = async (data, user, ip) => {
  const subscriptionPlan = await subscriptionPlanRepository.create(data);

  // Create audit log
  await createAuditLog({
    user_id: user?.id || null,
    action: 'CREATE',
    entity: 'subscription_plan',
    entity_id: subscriptionPlan.id,
    diff: { after: subscriptionPlan },
    ip
  }).catch(() => {});

  return subscriptionPlan;
};

/**
 * Update subscription plan
 *
 * @param {string} id - Subscription Plan ID
 * @param {Object} data - Update data
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Updated subscription plan
 */
const updateSubscriptionPlan = async (id, data, user, ip) => {
  const before = await getSubscriptionPlanById(id);
  const subscriptionPlan = await subscriptionPlanRepository.update(id, data);

  // Create audit log
  await createAuditLog({
    user_id: user?.id || null,
    action: 'UPDATE',
    entity: 'subscription_plan',
    entity_id: subscriptionPlan.id,
    diff: { before, after: subscriptionPlan },
    ip
  }).catch(() => {});

  return subscriptionPlan;
};

/**
 * Delete subscription plan (soft delete)
 *
 * @param {string} id - Subscription Plan ID
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Deleted subscription plan
 */
const deleteSubscriptionPlan = async (id, user, ip) => {
  const before = await getSubscriptionPlanById(id);
  const subscriptionPlan = await subscriptionPlanRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    user_id: user?.id || null,
    action: 'DELETE',
    entity: 'subscription_plan',
    entity_id: subscriptionPlan.id,
    diff: { before, after: subscriptionPlan },
    ip
  }).catch(() => {});

  return subscriptionPlan;
};

/**
 * Get computed entitlements for a subscription plan
 *
 * @param {string} id - Subscription Plan ID
 * @returns {Promise<Object>} Plan entitlement summary
 */
const getPlanEntitlements = async (id) => {
  const plan = await getSubscriptionPlanById(id);
  const tierCode = normalizeTierCode(plan.tier_code);

  return {
    subscription_plan_id: plan.id,
    code: plan.code,
    name: plan.name,
    tier_code: tierCode,
    billing_cycle: plan.billing_cycle,
    limits: {
      max_users: plan.max_users,
      max_facilities: plan.max_facilities,
      max_storage_mb: plan.max_storage_mb,
      max_modules: plan.max_modules,
      warning_percent: plan.plan_fit_warning_percent
    },
    base_entitlements: tierCode ? (TIER_BASE_ENTITLEMENTS[tierCode] || []) : [],
    add_on_eligibility: plan.add_on_eligibility_json || null,
    limit_policy: plan.limit_policy_json || null
  };
};

/**
 * Get add-on eligibility details for a subscription plan
 *
 * @param {string} id - Subscription Plan ID
 * @returns {Promise<Object>} Add-on eligibility details
 */
const getPlanAddOnEligibility = async (id) => {
  const plan = await getSubscriptionPlanById(id);
  const tierCode = normalizeTierCode(plan.tier_code);

  const addOns = ADD_ONS.map((addOn) => {
    const eligible = tierCode ? tierMeetsMinimum(tierCode, addOn.minimum_tier) : false;
    return {
      code: addOn.code,
      name: addOn.name,
      minimum_tier: addOn.minimum_tier,
      price_range: addOn.price_range,
      eligible
    };
  });

  return {
    subscription_plan_id: plan.id,
    tier_code: tierCode,
    add_ons: addOns
  };
};

module.exports = {
  getSubscriptionPlanById,
  listSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getPlanEntitlements,
  getPlanAddOnEligibility
};
