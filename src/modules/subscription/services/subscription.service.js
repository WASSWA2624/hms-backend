/**
 * Subscription service
 *
 * @module modules/subscription/services
 * @description Business logic layer for subscription operations.
 * Per module-creation.mdc: Only import and use its own repository.
 * Per module-creation.mdc: All mutations must call audit log creation.
 */

const subscriptionRepository = require('../repositories/subscription.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

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
  }).catch(err => {
    console.error('Audit log creation failed:', err);
  });

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
  }).catch(err => {
    console.error('Audit log creation failed:', err);
  });

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
  }).catch(err => {
    console.error('Audit log creation failed:', err);
  });

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
  }).catch(err => {
    console.error('Audit log creation failed:', err);
  });

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
  }).catch(err => {
    console.error('Audit log creation failed:', err);
  });

  return subscription;
};

module.exports = {
  getSubscriptionById,
  listSubscriptions,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  deleteSubscription
};
