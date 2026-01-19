/**
 * Breach notification controller
 *
 * @module modules/breach-notification/controllers
 * @description Request handlers for breach notification endpoints.
 * Per module-creation.mdc: All methods wrapped with asyncHandler.
 * Per response-format.mdc: Use standardized response helpers.
 */

const breachNotificationService = require('../services/breach-notification.service');
const { asyncHandler } = require('@lib/async');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');
const { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } = require('@config/constants');

/**
 * List breach notifications with pagination
 * GET /api/v1/breach-notifications
 */
const listBreachNotifications = asyncHandler(async (req, res) => {
  const {
    severity,
    status,
    from_date,
    to_date,
    page = DEFAULT_PAGE,
    limit = DEFAULT_PAGE_LIMIT,
    sort_by,
    order = 'desc'
  } = req.query;

  const filters = {
    severity,
    status,
    from_date,
    to_date
  };

  const userId = req.user?.id;
  const ipAddress = req.ip;

  const result = await breachNotificationService.listBreachNotifications(
    filters,
    parseInt(page),
    parseInt(limit),
    sort_by,
    order,
    userId,
    ipAddress
  );

  sendPaginated(res, 'messages.breach_notification.list.success', result.breachNotifications, result.pagination);
});

/**
 * Get breach notification by ID
 * GET /api/v1/breach-notifications/:id
 */
const getBreachNotificationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const breachNotification = await breachNotificationService.getBreachNotificationById(id, userId, ipAddress);

  sendSuccess(res, 200, 'messages.breach_notification.get.success', breachNotification);
});

/**
 * Create new breach notification
 * POST /api/v1/breach-notifications
 */
const createBreachNotification = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const tenantId = req.user?.tenant_id;
  const ipAddress = req.ip;

  const breachNotification = await breachNotificationService.createBreachNotification(
    req.body,
    tenantId,
    userId,
    ipAddress
  );

  sendSuccess(res, 201, 'messages.breach_notification.create.success', breachNotification);
});

/**
 * Update breach notification
 * PUT /api/v1/breach-notifications/:id
 */
const updateBreachNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const breachNotification = await breachNotificationService.updateBreachNotification(
    id,
    req.body,
    userId,
    ipAddress
  );

  sendSuccess(res, 200, 'messages.breach_notification.update.success', breachNotification);
});

/**
 * Resolve breach notification
 * POST /api/v1/breach-notifications/:id/resolve
 */
const resolveBreachNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { resolved_at } = req.body;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const breachNotification = await breachNotificationService.resolveBreachNotification(
    id,
    resolved_at ? new Date(resolved_at) : null,
    userId,
    ipAddress
  );

  sendSuccess(res, 200, 'messages.breach_notification.resolve.success', breachNotification);
});

/**
 * Delete breach notification (soft delete)
 * DELETE /api/v1/breach-notifications/:id
 */
const deleteBreachNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  await breachNotificationService.deleteBreachNotification(id, userId, ipAddress);

  sendNoContent(res);
});

module.exports = {
  listBreachNotifications,
  getBreachNotificationById,
  createBreachNotification,
  updateBreachNotification,
  resolveBreachNotification,
  deleteBreachNotification
};
