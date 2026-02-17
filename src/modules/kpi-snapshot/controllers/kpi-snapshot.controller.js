/**
 * KPI snapshot controller
 *
 * @module modules/kpi-snapshot/controllers
 * @description Request handlers for KPI snapshot endpoints.
 * Per module-creation.mdc: All methods wrapped with asyncHandler.
 * Per response-format.mdc: Use standardized response helpers.
 */

const kpiSnapshotService = require('@services/kpi-snapshot/kpi-snapshot.service');
const { asyncHandler } = require('@lib/async');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');
const { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } = require('@config/constants');

/**
 * List KPI snapshots with pagination
 * GET /api/v1/kpi-snapshots
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const listKpiSnapshots = asyncHandler(async (req, res) => {
  const {
    tenant_id,
    name,
    search,
    recorded_at_from,
    recorded_at_to,
    page = DEFAULT_PAGE,
    limit = DEFAULT_PAGE_LIMIT,
    sort_by,
    order = 'asc'
  } = req.query;

  const filters = {
    tenant_id,
    name,
    search,
    recorded_at_from,
    recorded_at_to
  };

  const userId = req.user?.id;
  const ipAddress = req.ip;

  const result = await kpiSnapshotService.listKpiSnapshots(
    filters,
    parseInt(page),
    parseInt(limit),
    sort_by,
    order,
    userId,
    ipAddress
  );

  sendPaginated(res, 'messages.kpi_snapshot.list.success', result.kpiSnapshots, result.pagination);
});

/**
 * Get KPI snapshot by ID
 * GET /api/v1/kpi-snapshots/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getKpiSnapshotById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const kpiSnapshot = await kpiSnapshotService.getKpiSnapshotById(id, userId, ipAddress);

  sendSuccess(res, 200, 'messages.kpi_snapshot.get.success', kpiSnapshot);
});

/**
 * Create new KPI snapshot
 * POST /api/v1/kpi-snapshots
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const createKpiSnapshot = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const kpiSnapshot = await kpiSnapshotService.createKpiSnapshot(req.body, userId, ipAddress);

  sendSuccess(res, 201, 'messages.kpi_snapshot.create.success', kpiSnapshot);
});

/**
 * Update KPI snapshot
 * PUT /api/v1/kpi-snapshots/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const updateKpiSnapshot = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const kpiSnapshot = await kpiSnapshotService.updateKpiSnapshot(id, req.body, userId, ipAddress);

  sendSuccess(res, 200, 'messages.kpi_snapshot.update.success', kpiSnapshot);
});

/**
 * Delete KPI snapshot (soft delete)
 * DELETE /api/v1/kpi-snapshots/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const deleteKpiSnapshot = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  await kpiSnapshotService.deleteKpiSnapshot(id, userId, ipAddress);

  sendNoContent(res);
});

module.exports = {
  listKpiSnapshots,
  getKpiSnapshotById,
  createKpiSnapshot,
  updateKpiSnapshot,
  deleteKpiSnapshot
};
