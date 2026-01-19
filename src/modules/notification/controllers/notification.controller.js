/**
 * Notification controller
 *
 * @module modules/notification/controllers
 * @description Request handlers for notification endpoints.
 * Per module-creation.mdc: All methods wrapped with asyncHandler.
 * Per response-format.mdc: Use standardized response helpers.
 */

const notificationService = require('../services/notification.service');
const { asyncHandler } = require('@lib/async');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');
const { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } = require('@config/constants');

/**
 * List notifications with pagination
 * GET /api/v1/notifications
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const listNotifications = asyncHandler(async (req, res) => {
  const {
    tenant_id,
    user_id,
    notification_type,
    priority,
    is_read,
    page = DEFAULT_PAGE,
    limit = DEFAULT_PAGE_LIMIT,
    sort_by,
    order = 'desc'
  } = req.query;

  const filters = {
    tenant_id,
    user_id,
    notification_type,
    priority,
    is_read
  };

  const userId = req.user?.id;
  const ipAddress = req.ip;

  const result = await notificationService.listNotifications(
    filters,
    parseInt(page),
    parseInt(limit),
    sort_by,
    order,
    userId,
    ipAddress
  );

  sendPaginated(res, 'messages.notification.list.success', result.notifications, result.pagination);
});

/**
 * Get notification by ID
 * GET /api/v1/notifications/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getNotificationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const notification = await notificationService.getNotificationById(id, userId, ipAddress);

  sendSuccess(res, 200, 'messages.notification.get.success', notification);
});

/**
 * Create new notification
 * POST /api/v1/notifications
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const createNotification = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const notification = await notificationService.createNotification(req.body, userId, ipAddress);

  sendSuccess(res, 201, 'messages.notification.create.success', notification);
});

/**
 * Update notification
 * PUT /api/v1/notifications/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const updateNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const notification = await notificationService.updateNotification(id, req.body, userId, ipAddress);

  sendSuccess(res, 200, 'messages.notification.update.success', notification);
});

/**
 * Delete notification (soft delete)
 * DELETE /api/v1/notifications/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  await notificationService.deleteNotification(id, userId, ipAddress);

  sendNoContent(res);
});

module.exports = {
  listNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  deleteNotification
};
