/**
 * Dashboard widget controller
 *
 * @module modules/dashboard-widget/controllers
 * @description Request handlers for dashboard widget endpoints.
 * Per module-creation.mdc: All methods wrapped with asyncHandler.
 * Per response-format.mdc: Use standardized response helpers.
 */

const dashboardWidgetService = require('@services/dashboard-widget/dashboard-widget.service');
const { asyncHandler } = require('@lib/async');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');
const { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } = require('@config/constants');

/**
 * List dashboard widgets with pagination
 * GET /api/v1/dashboard-widgets
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const listDashboardWidgets = asyncHandler(async (req, res) => {
  const {
    tenant_id,
    name,
    search,
    page = DEFAULT_PAGE,
    limit = DEFAULT_PAGE_LIMIT,
    sort_by,
    order = 'asc'
  } = req.query;

  const filters = {
    tenant_id,
    name,
    search
  };

  const userId = req.user?.id;
  const ipAddress = req.ip;

  const result = await dashboardWidgetService.listDashboardWidgets(
    filters,
    parseInt(page),
    parseInt(limit),
    sort_by,
    order,
    userId,
    ipAddress
  );

  sendPaginated(res, 'messages.dashboard_widget.list.success', result.dashboardWidgets, result.pagination);
});

/**
 * Get dashboard widget by ID
 * GET /api/v1/dashboard-widgets/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getDashboardWidgetById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const dashboardWidget = await dashboardWidgetService.getDashboardWidgetById(id, userId, ipAddress);

  sendSuccess(res, 200, 'messages.dashboard_widget.get.success', dashboardWidget);
});

/**
 * Create new dashboard widget
 * POST /api/v1/dashboard-widgets
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const createDashboardWidget = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const dashboardWidget = await dashboardWidgetService.createDashboardWidget(req.body, userId, ipAddress);

  sendSuccess(res, 201, 'messages.dashboard_widget.create.success', dashboardWidget);
});

/**
 * Update dashboard widget
 * PUT /api/v1/dashboard-widgets/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const updateDashboardWidget = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const dashboardWidget = await dashboardWidgetService.updateDashboardWidget(id, req.body, userId, ipAddress);

  sendSuccess(res, 200, 'messages.dashboard_widget.update.success', dashboardWidget);
});

/**
 * Delete dashboard widget (soft delete)
 * DELETE /api/v1/dashboard-widgets/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const deleteDashboardWidget = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  await dashboardWidgetService.deleteDashboardWidget(id, userId, ipAddress);

  sendNoContent(res);
});

module.exports = {
  listDashboardWidgets,
  getDashboardWidgetById,
  createDashboardWidget,
  updateDashboardWidget,
  deleteDashboardWidget
};
