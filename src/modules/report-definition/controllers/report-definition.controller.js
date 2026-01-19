/**
 * Report definition controller
 *
 * @module modules/report-definition/controllers
 * @description HTTP request handlers for report definition operations.
 * Per module-creation.mdc: Controllers call services and use response helpers.
 * Per module-creation.mdc: All methods wrapped with asyncHandler.
 */

const reportDefinitionService = require('@services/report-definition/report-definition.service');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');
const { asyncHandler } = require('@lib/async');

/**
 * List all report definitions with pagination
 * GET /api/v1/report-definitions
 */
const listReportDefinitions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sort_by = 'created_at', order = 'desc', ...filters } = req.query;

  const result = await reportDefinitionService.listReportDefinitions(
    filters,
    parseInt(page),
    parseInt(limit),
    sort_by,
    order
  );

  sendPaginated(
    res,
    'messages.report_definition.list_success',
    result.reportDefinitions,
    result.pagination
  );
});

/**
 * Get single report definition by ID
 * GET /api/v1/report-definitions/:id
 */
const getReportDefinitionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const reportDefinition = await reportDefinitionService.getReportDefinitionById(id);

  sendSuccess(res, 200, 'messages.report_definition.get_success', reportDefinition);
});

/**
 * Create new report definition
 * POST /api/v1/report-definitions
 */
const createReportDefinition = asyncHandler(async (req, res) => {
  const data = req.body;
  
  // Build context for audit logging
  const context = {
    user_id: req.user?.id,
    tenant_id: req.tenant?.id,
    facility_id: req.facility?.id,
    ip_address: req.ip,
    user_agent: req.get('user-agent')
  };

  const reportDefinition = await reportDefinitionService.createReportDefinition(data, context);

  sendSuccess(res, 201, 'messages.report_definition.create_success', reportDefinition);
});

/**
 * Update existing report definition
 * PUT /api/v1/report-definitions/:id
 */
const updateReportDefinition = asyncHandler(async (req, res) => {
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

  const reportDefinition = await reportDefinitionService.updateReportDefinition(id, data, context);

  sendSuccess(res, 200, 'messages.report_definition.update_success', reportDefinition);
});

/**
 * Delete report definition (soft delete)
 * DELETE /api/v1/report-definitions/:id
 */
const deleteReportDefinition = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Build context for audit logging
  const context = {
    user_id: req.user?.id,
    tenant_id: req.tenant?.id,
    facility_id: req.facility?.id,
    ip_address: req.ip,
    user_agent: req.get('user-agent')
  };

  await reportDefinitionService.deleteReportDefinition(id, context);

  sendNoContent(res);
});

module.exports = {
  listReportDefinitions,
  getReportDefinitionById,
  createReportDefinition,
  updateReportDefinition,
  deleteReportDefinition
};
