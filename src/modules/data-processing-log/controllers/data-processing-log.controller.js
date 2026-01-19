/**
 * Data processing log controller
 *
 * @module modules/data-processing-log/controllers
 * @description Controller layer for data processing log operations.
 * Per module-creation.mdc: All methods wrapped with asyncHandler.
 * Per module-creation.mdc: Use response helpers from @lib/response/*.
 */

const dataProcessingLogService = require('@modules/data-processing-log/services/data-processing-log.service');
const { asyncHandler } = require('@lib/async');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');

/**
 * Get data processing log by ID
 * GET /api/v1/data-processing-logs/:id
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDataProcessingLogById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dataProcessingLog = await dataProcessingLogService.getDataProcessingLogById(id);
  
  sendSuccess(res, 200, 'messages.data_processing_log.retrieved', dataProcessingLog);
});

/**
 * Get paginated list of data processing logs
 * GET /api/v1/data-processing-logs
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getDataProcessingLogs = asyncHandler(async (req, res) => {
  const { 
    page, 
    limit, 
    sort_by, 
    order,
    tenant_id,
    user_id,
    purpose,
    legal_basis,
    date_from,
    date_to
  } = req.query;

  const filters = {
    tenant_id,
    user_id,
    purpose,
    legal_basis,
    date_from,
    date_to
  };

  const result = await dataProcessingLogService.getDataProcessingLogs(
    filters,
    parseInt(page) || 1,
    parseInt(limit) || 20,
    sort_by || 'processed_at',
    order || 'desc'
  );

  sendPaginated(res, 'messages.data_processing_log.list_retrieved', result.data, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages
  });
});

/**
 * Create new data processing log
 * POST /api/v1/data-processing-logs
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createDataProcessingLog = asyncHandler(async (req, res) => {
  const data = req.body;
  const userId = req.user?.id || null;
  const ipAddress = req.ip || req.connection?.remoteAddress || null;

  const dataProcessingLog = await dataProcessingLogService.createDataProcessingLog(data, userId, ipAddress);

  sendSuccess(res, 201, 'messages.data_processing_log.created', dataProcessingLog);
});

/**
 * Update data processing log
 * PUT /api/v1/data-processing-logs/:id
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateDataProcessingLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const userId = req.user?.id || null;
  const ipAddress = req.ip || req.connection?.remoteAddress || null;

  const dataProcessingLog = await dataProcessingLogService.updateDataProcessingLog(id, data, userId, ipAddress);

  sendSuccess(res, 200, 'messages.data_processing_log.updated', dataProcessingLog);
});

/**
 * Delete data processing log (soft delete)
 * DELETE /api/v1/data-processing-logs/:id
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteDataProcessingLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || null;
  const ipAddress = req.ip || req.connection?.remoteAddress || null;

  await dataProcessingLogService.deleteDataProcessingLog(id, userId, ipAddress);

  sendNoContent(res);
});

module.exports = {
  getDataProcessingLogById,
  getDataProcessingLogs,
  createDataProcessingLog,
  updateDataProcessingLog,
  deleteDataProcessingLog
};
