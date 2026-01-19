/**
 * Visit queue controller
 *
 * @module modules/visit-queue/controllers
 * @description Handles HTTP requests for visit queue endpoints.
 * Per module-creation.mdc: All methods must use asyncHandler.
 * Per module-creation.mdc: Use response helpers from @lib/response.
 */

const visitQueueService = require('@services/visit-queue/visit-queue.service');
const { asyncHandler } = require('@lib/async');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');

/**
 * List visit queue entries with pagination
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 */
const listVisitQueues = asyncHandler(async (req, res) => {
  const { page, limit, sort_by, order, tenant_id, facility_id, patient_id, appointment_id, provider_user_id, status, search } = req.query;

  const filters = {};
  if (tenant_id) filters.tenant_id = tenant_id;
  if (facility_id) filters.facility_id = facility_id;
  if (patient_id) filters.patient_id = patient_id;
  if (appointment_id) filters.appointment_id = appointment_id;
  if (provider_user_id) filters.provider_user_id = provider_user_id;
  if (status) filters.status = status;
  if (search) filters.search = search;

  const result = await visitQueueService.listVisitQueues(
    filters,
    page,
    limit,
    sort_by,
    order
  );

  return sendPaginated(
    res,
    'messages.visit_queue.list.success',
    result.entries,
    result.pagination
  );
});

/**
 * Get visit queue entry by ID
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 */
const getVisitQueueById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const entry = await visitQueueService.getVisitQueueById(id);

  return sendSuccess(res, 200, 'messages.visit_queue.get.success', entry);
});

/**
 * Create visit queue entry
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 */
const createVisitQueue = asyncHandler(async (req, res) => {
  const data = req.body;
  
  // Build context for audit log
  const context = {
    user_id: req.user?.id,
    tenant_id: req.user?.tenant_id,
    facility_id: req.user?.facility_id,
    ip_address: req.ip,
    user_agent: req.get('user-agent')
  };

  const entry = await visitQueueService.createVisitQueue(data, context);

  return sendSuccess(res, 201, 'messages.visit_queue.create.success', entry);
});

/**
 * Update visit queue entry
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 */
const updateVisitQueue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  
  // Build context for audit log
  const context = {
    user_id: req.user?.id,
    tenant_id: req.user?.tenant_id,
    facility_id: req.user?.facility_id,
    ip_address: req.ip,
    user_agent: req.get('user-agent')
  };

  const entry = await visitQueueService.updateVisitQueue(id, data, context);

  return sendSuccess(res, 200, 'messages.visit_queue.update.success', entry);
});

/**
 * Delete visit queue entry
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {Promise<void>}
 */
const deleteVisitQueue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Build context for audit log
  const context = {
    user_id: req.user?.id,
    tenant_id: req.user?.tenant_id,
    facility_id: req.user?.facility_id,
    ip_address: req.ip,
    user_agent: req.get('user-agent')
  };

  await visitQueueService.deleteVisitQueue(id, context);

  return sendNoContent(res);
});

module.exports = {
  listVisitQueues,
  getVisitQueueById,
  createVisitQueue,
  updateVisitQueue,
  deleteVisitQueue
};
