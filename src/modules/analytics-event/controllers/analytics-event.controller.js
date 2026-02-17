/**
 * Analytics event controller
 *
 * @module modules/analytics-event/controllers
 * @description Request handlers for analytics event endpoints.
 * Per module-creation.mdc: All methods wrapped with asyncHandler.
 * Per response-format.mdc: Use standardized response helpers.
 */

const analyticsEventService = require('@services/analytics-event/analytics-event.service');
const { asyncHandler } = require('@lib/async');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');
const { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } = require('@config/constants');

/**
 * List analytics events with pagination
 * GET /api/v1/analytics-events
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const listAnalyticsEvents = asyncHandler(async (req, res) => {
  const {
    tenant_id,
    user_id,
    event_name,
    search,
    occurred_at_from,
    occurred_at_to,
    page = DEFAULT_PAGE,
    limit = DEFAULT_PAGE_LIMIT,
    sort_by,
    order = 'asc'
  } = req.query;

  const filters = {
    tenant_id,
    user_id,
    event_name,
    search,
    occurred_at_from,
    occurred_at_to
  };

  const userIdAuth = req.user?.id;
  const ipAddress = req.ip;

  const result = await analyticsEventService.listAnalyticsEvents(
    filters,
    parseInt(page),
    parseInt(limit),
    sort_by,
    order,
    userIdAuth,
    ipAddress
  );

  sendPaginated(res, 'messages.analytics_event.list.success', result.analyticsEvents, result.pagination);
});

/**
 * Get analytics event by ID
 * GET /api/v1/analytics-events/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getAnalyticsEventById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const analyticsEvent = await analyticsEventService.getAnalyticsEventById(id, userId, ipAddress);

  sendSuccess(res, 200, 'messages.analytics_event.get.success', analyticsEvent);
});

/**
 * Create new analytics event
 * POST /api/v1/analytics-events
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const createAnalyticsEvent = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const analyticsEvent = await analyticsEventService.createAnalyticsEvent(req.body, userId, ipAddress);

  sendSuccess(res, 201, 'messages.analytics_event.create.success', analyticsEvent);
});

/**
 * Update analytics event
 * PUT /api/v1/analytics-events/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const updateAnalyticsEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const analyticsEvent = await analyticsEventService.updateAnalyticsEvent(id, req.body, userId, ipAddress);

  sendSuccess(res, 200, 'messages.analytics_event.update.success', analyticsEvent);
});

/**
 * Delete analytics event (soft delete)
 * DELETE /api/v1/analytics-events/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const deleteAnalyticsEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  await analyticsEventService.deleteAnalyticsEvent(id, userId, ipAddress);

  sendNoContent(res);
});

module.exports = {
  listAnalyticsEvents,
  getAnalyticsEventById,
  createAnalyticsEvent,
  updateAnalyticsEvent,
  deleteAnalyticsEvent
};
