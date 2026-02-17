/**
 * KPI snapshot routes
 *
 * @module modules/kpi-snapshot/routes
 * @description KPI snapshot endpoints mounted at /api/v1/kpi-snapshots
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const kpiSnapshotController = require('@controllers/kpi-snapshot/kpi-snapshot.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createKpiSnapshotSchema,
  updateKpiSnapshotSchema,
  kpiSnapshotIdParamsSchema,
  listKpiSnapshotsQuerySchema
} = require('@validations/kpi-snapshot/kpi-snapshot.schema');

/**
 * @description List KPI snapshots with pagination and filters
 * @method GET
 * @route /api/v1/kpi-snapshots/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [name] - Filter by KPI name (partial match)
 * @queryParams {string} [search] - Search in name field
 * @queryParams {string} [recorded_at_from] - Filter by recorded_at from date (ISO 8601)
 * @queryParams {string} [recorded_at_to] - Filter by recorded_at to date (ISO 8601)
 * @bodyParams None
 * @returns {Object} Paginated list of KPI snapshots
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listKpiSnapshotsQuerySchema }),

  authenticate(),
  kpiSnapshotController.listKpiSnapshots
);

/**
 * @description Get KPI snapshot by ID
 * @method GET
 * @route /api/v1/kpi-snapshots/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - KPI snapshot ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} KPI snapshot data
 * @throws 401 Unauthorized
 * @throws 404 KPI snapshot not found
 */
router.get(
  '/:id',  validateRequest({ params: kpiSnapshotIdParamsSchema }),

  authenticate(),
  kpiSnapshotController.getKpiSnapshotById
);

/**
 * @description Create new KPI snapshot
 * @method POST
 * @route /api/v1/kpi-snapshots/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} name - KPI name (required, max 255 chars)
 * @bodyParams {string} value - KPI value (required, decimal with up to 4 decimal places)
 * @bodyParams {string} [recorded_at] - Recorded at timestamp (ISO 8601)
 * @returns {Object} Created KPI snapshot
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',  validateRequest({ body: createKpiSnapshotSchema }),

  authenticate(),
  kpiSnapshotController.createKpiSnapshot
);

/**
 * @description Update KPI snapshot
 * @method PUT
 * @route /api/v1/kpi-snapshots/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - KPI snapshot ID (UUID)
 * @queryParams None
 * @bodyParams {string} [name] - KPI name (max 255 chars)
 * @bodyParams {string} [value] - KPI value (decimal with up to 4 decimal places)
 * @bodyParams {string} [recorded_at] - Recorded at timestamp (ISO 8601)
 * @returns {Object} Updated KPI snapshot
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 KPI snapshot not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: kpiSnapshotIdParamsSchema, body: updateKpiSnapshotSchema }),

  authenticate(),
  kpiSnapshotController.updateKpiSnapshot
);

/**
 * @description Delete KPI snapshot (soft delete)
 * @method DELETE
 * @route /api/v1/kpi-snapshots/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - KPI snapshot ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 KPI snapshot not found
 */
router.delete(
  '/:id',  validateRequest({ params: kpiSnapshotIdParamsSchema }),

  authenticate(),
  kpiSnapshotController.deleteKpiSnapshot
);

module.exports = router;
