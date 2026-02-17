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

module.exports = {
  getSubscriptionPlanById,
  listSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan
};
