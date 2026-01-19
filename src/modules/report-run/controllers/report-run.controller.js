/**
 * Report run controller
 *
 * @module modules/report-run/controllers
 * @description HTTP request handlers for report run operations.
 * Per module-creation.mdc: Controllers call services and use response helpers.
 * Per module-creation.mdc: All methods wrapped with asyncHandler.
 */

const reportRunService = require('@services/report-run/report-run.service');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');
const { asyncHandler } = require('@lib/async');

/**
 * List all report runs with pagination
 * GET /api/v1/report-runs
 */
const listReportRuns = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sort_by = 'created_at', order = 'desc', ...filters } = req.query;

  const result = await reportRunService.listReportRuns(
    filters,
    parseInt(page),
    parseInt(limit),
    sort_by,
    order
  );

  sendPaginated(
    res,
    'messages.report_run.list_success',
    result.reportRuns,
    result.pagination
  );
});

/**
 * Get single report run by ID
 * GET /api/v1/report-runs/:id
 */
const getReportRunById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const reportRun = await reportRunService.getReportRunById(id);

  sendSuccess(res, 200, 'messages.report_run.get_success', reportRun);
});

/**
 * Create new report run
 * POST /api/v1/report-runs
 */
const createReportRun = asyncHandler(async (req, res) => {
  const data = req.body;
  
  // Build context for audit logging
  const context = {
    user_id: req.user?.id,
    tenant_id: req.tenant?.id,
    facility_id: req.facility?.id,
    ip_address: req.ip,
    user_agent: req.get('user-agent')
  };

  const reportRun = await reportRunService.createReportRun(data, context);

  sendSuccess(res, 201, 'messages.report_run.create_success', reportRun);
});

/**
 * Update existing report run
 * PUT /api/v1/report-runs/:id
 */
const updateReportRun = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  
  // Build context for audit logging
  const context = {
    user_id: req.user?.id,
    tenant_id: req.tenant?.id,
    facility_id: req.facility?.id,
    ip_address: req.ip,
    user_agent: req.get('user-agent')
  };

  const reportRun = await reportRunService.updateReportRun(id, data, context);

  sendSuccess(res, 200, 'messages.report_run.update_success', reportRun);
});

/**
 * Delete report run (soft delete)
 * DELETE /api/v1/report-runs/:id
 */
const deleteReportRun = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Build context for audit logging
  const context = {
    user_id: req.user?.id,
    tenant_id: req.tenant?.id,
    facility_id: req.facility?.id,
    ip_address: req.ip,
    user_agent: req.get('user-agent')
  };

  await reportRunService.deleteReportRun(id, context);

  sendNoContent(res);
});

module.exports = {
  listReportRuns,
  getReportRunById,
  createReportRun,
  updateReportRun,
  deleteReportRun
};
