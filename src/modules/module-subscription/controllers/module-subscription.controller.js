/**
 * Module subscription controller
 *
 * @module modules/module-subscription/controllers
 * @description Request handlers for module subscription endpoints.
 * Per module-creation.mdc: All methods wrapped with asyncHandler.
 * Per api.mdc: Use standard response helpers.
 */

const moduleSubscriptionService = require('@services/module-subscription/module-subscription.service');
const { asyncHandler } = require('@lib/async');
const { sendSuccess, sendPaginated } = require('@lib/response');
const { getLocale } = require('@lib/i18n');

/**
 * List all module subscriptions
 * GET /api/v1/module-subscriptions
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 */
const listModuleSubscriptions = asyncHandler(async (req, res) => {
  const locale = getLocale(req);
  const { page = 1, limit = 20, sort_by = 'created_at', order = 'desc', module_id, subscription_id, is_active } = req.query;

  const filters = {};
  if (module_id) filters.module_id = module_id;
  if (subscription_id) filters.subscription_id = subscription_id;
  if (is_active) filters.is_active = is_active;

  const result = await moduleSubscriptionService.listModuleSubscriptions(
    filters,
    parseInt(page),
    parseInt(limit),
    sort_by,
    order
  );

  sendPaginated(
    res,
    'messages.module_subscription.list.success',
    result.module_subscriptions,
    result.pagination,
    locale
  );
});

/**
 * Get module subscription by ID
 * GET /api/v1/module-subscriptions/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 */
const getModuleSubscriptionById = asyncHandler(async (req, res) => {
  const locale = getLocale(req);
  const { id } = req.params;

  const moduleSubscription = await moduleSubscriptionService.getModuleSubscriptionById(id);

  sendSuccess(
    res,
    200,
    'messages.module_subscription.get.success',
    moduleSubscription,
    locale
  );
});

/**
 * Create new module subscription
 * POST /api/v1/module-subscriptions
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 */
const createModuleSubscription = asyncHandler(async (req, res) => {
  const locale = getLocale(req);
  const context = {
    user: req.user,
    ip: req.ip,
    tenant_id: req.user?.tenant_id
  };

  const moduleSubscription = await moduleSubscriptionService.createModuleSubscription(req.body, context);

  sendSuccess(
    res,
    201,
    'messages.module_subscription.create.success',
    moduleSubscription,
    locale
  );
});

/**
 * Update module subscription
 * PUT /api/v1/module-subscriptions/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 */
const updateModuleSubscription = asyncHandler(async (req, res) => {
  const locale = getLocale(req);
  const { id } = req.params;
  const context = {
    user: req.user,
    ip: req.ip,
    tenant_id: req.user?.tenant_id
  };

  const moduleSubscription = await moduleSubscriptionService.updateModuleSubscription(id, req.body, context);

  sendSuccess(
    res,
    200,
    'messages.module_subscription.update.success',
    moduleSubscription,
    locale
  );
});

/**
 * Delete module subscription
 * DELETE /api/v1/module-subscriptions/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 */
const deleteModuleSubscription = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const context = {
    user: req.user,
    ip: req.ip,
    tenant_id: req.user?.tenant_id
  };

  await moduleSubscriptionService.deleteModuleSubscription(id, context);

  // Per response-format.mdc: DELETE returns 204 with no body
  res.status(204).send();
});

module.exports = {
  listModuleSubscriptions,
  getModuleSubscriptionById,
  createModuleSubscription,
  updateModuleSubscription,
  deleteModuleSubscription
};
