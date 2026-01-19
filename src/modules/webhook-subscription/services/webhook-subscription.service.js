/**
 * Webhook subscription service
 *
 * @module modules/webhook-subscription/services
 * @description Business logic layer for webhook subscription operations.
 * Per module-creation.mdc: Services implement business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const webhookSubscriptionRepository = require('@repositories/webhook-subscription/webhook-subscription.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const prisma = require('@prisma/client');

/**
 * Get webhook subscription by ID
 *
 * @param {string} id - Webhook subscription ID
 * @returns {Promise<Object>} Webhook subscription object
 * @throws {HttpError} 404 if webhook subscription not found
 */
const getWebhookSubscriptionById = async (id) => {
  const webhookSubscription = await webhookSubscriptionRepository.findById(id, {
    tenant: true,
    integration: true
  });
  
  if (!webhookSubscription) {
    throw new HttpError('errors.webhook_subscription.not_found', 404);
  }
  
  return webhookSubscription;
};

/**
 * List webhook subscriptions with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated webhook subscriptions
 */
const listWebhookSubscriptions = async (filters = {}, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };
  
  // Build filter object
  const where = {};
  
  if (filters.tenant_id) {
    where.tenant_id = filters.tenant_id;
  }
  
  if (filters.integration_id) {
    where.integration_id = filters.integration_id;
  }
  
  if (filters.event) {
    where.event = {
      contains: filters.event
    };
  }
  
  if (typeof filters.is_active === 'boolean') {
    where.is_active = filters.is_active;
  }
  
  if (filters.search) {
    where.OR = [
      { event: { contains: filters.search } },
      { target_url: { contains: filters.search } }
    ];
  }
  
  const [webhookSubscriptions, total] = await Promise.all([
    webhookSubscriptionRepository.findMany(where, skip, limit, orderBy, {
      tenant: true,
      integration: true
    }),
    webhookSubscriptionRepository.count(where)
  ]);
  
  return {
    data: webhookSubscriptions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    }
  };
};

/**
 * Create new webhook subscription
 *
 * @param {Object} data - Webhook subscription data
 * @param {Object} auditContext - Audit context (user_id, tenant_id, ip_address)
 * @returns {Promise<Object>} Created webhook subscription
 */
const createWebhookSubscription = async (data, auditContext) => {
  const webhookSubscription = await webhookSubscriptionRepository.create(data);
  
  // Per module-creation.mdc: All mutations must call createAuditLog
  await createAuditLog({
    action: 'CREATE',
    entity: 'webhook_subscription',
    entity_id: webhookSubscription.id,
    new_values: webhookSubscription,
    ...auditContext
  });
  
  return webhookSubscription;
};

/**
 * Update webhook subscription
 *
 * @param {string} id - Webhook subscription ID
 * @param {Object} data - Update data
 * @param {Object} auditContext - Audit context (user_id, tenant_id, ip_address)
 * @returns {Promise<Object>} Updated webhook subscription
 * @throws {HttpError} 404 if webhook subscription not found
 */
const updateWebhookSubscription = async (id, data, auditContext) => {
  // Verify webhook subscription exists
  const existingWebhookSubscription = await getWebhookSubscriptionById(id);
  
  const updated = await webhookSubscriptionRepository.update(id, data);
  
  // Per module-creation.mdc: All mutations must call createAuditLog
  await createAuditLog({
    action: 'UPDATE',
    entity: 'webhook_subscription',
    entity_id: id,
    old_values: existingWebhookSubscription,
    new_values: updated,
    ...auditContext
  });
  
  return updated;
};

/**
 * Delete webhook subscription (soft delete)
 *
 * @param {string} id - Webhook subscription ID
 * @param {Object} auditContext - Audit context (user_id, tenant_id, ip_address)
 * @returns {Promise<Object>} Deleted webhook subscription
 * @throws {HttpError} 404 if webhook subscription not found
 */
const deleteWebhookSubscription = async (id, auditContext) => {
  // Verify webhook subscription exists
  const existingWebhookSubscription = await getWebhookSubscriptionById(id);
  
  const deleted = await webhookSubscriptionRepository.softDelete(id);
  
  // Per module-creation.mdc: All mutations must call createAuditLog
  await createAuditLog({
    action: 'DELETE',
    entity: 'webhook_subscription',
    entity_id: id,
    old_values: existingWebhookSubscription,
    ...auditContext
  });
  
  return deleted;
};

module.exports = {
  getWebhookSubscriptionById,
  listWebhookSubscriptions,
  createWebhookSubscription,
  updateWebhookSubscription,
  deleteWebhookSubscription
};
