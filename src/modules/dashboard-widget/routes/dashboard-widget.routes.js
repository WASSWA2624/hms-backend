/**
 * Dashboard widget routes
 *
 * @module modules/dashboard-widget/routes
 * @description Dashboard widget endpoints mounted at /api/v1/dashboard-widgets
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const dashboardWidgetController = require('@controllers/dashboard-widget/dashboard-widget.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createDashboardWidgetSchema,
  updateDashboardWidgetSchema,
  dashboardWidgetIdParamsSchema,
  listDashboardWidgetsQuerySchema,
  dashboardSummaryQuerySchema
} = require('@validations/dashboard-widget/dashboard-widget.schema');

/**
 * @description List dashboard widgets with pagination and filters
 * @method GET
 * @route /api/v1/dashboard-widgets/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [name] - Filter by widget name (partial match)
 * @queryParams {string} [search] - Search in name field
 * @bodyParams None
 * @returns {Object} Paginated list of dashboard widgets
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  validateRequest({ query: listDashboardWidgetsQuerySchema }),

  authenticate(),
  dashboardWidgetController.listDashboardWidgets
);

/**
 * @description Get role-scoped dashboard summary widgets
 * @method GET
 * @route /api/v1/dashboard-widgets/summary
 * @authentication Required (JWT)
 * @permissions Authenticated staff users
 * @queryParams {string} [tenant_id] - Tenant context (required for SUPER_ADMIN without tenant token scope)
 * @queryParams {string} [facility_id] - Facility context
 * @queryParams {string} [branch_id] - Branch context
 * @queryParams {number} [days=7] - Trend range in days (1..30)
 * @returns {Object} Dashboard summary payload
 * @throws 401 Unauthorized
 * @throws 422 Missing tenant context for SUPER_ADMIN
 */
router.get(
  '/summary',
  validateRequest({ query: dashboardSummaryQuerySchema }),

  authenticate(),
  dashboardWidgetController.getDashboardSummary
);

/**
 * @description Get dashboard widget by ID
 * @method GET
 * @route /api/v1/dashboard-widgets/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Dashboard widget ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Dashboard widget data
 * @throws 401 Unauthorized
 * @throws 404 Dashboard widget not found
 */
router.get(
  '/:id',
  validateRequest({ params: dashboardWidgetIdParamsSchema }),

  authenticate(),
  dashboardWidgetController.getDashboardWidgetById
);

/**
 * @description Create new dashboard widget
 * @method POST
 * @route /api/v1/dashboard-widgets/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} name - Widget name (required, max 255 chars)
 * @bodyParams {Object} config_json - Widget configuration (required, JSON object)
 * @returns {Object} Created dashboard widget
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',
  validateRequest({ body: createDashboardWidgetSchema }),

  authenticate(),
  dashboardWidgetController.createDashboardWidget
);

/**
 * @description Update dashboard widget
 * @method PUT
 * @route /api/v1/dashboard-widgets/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Dashboard widget ID (UUID)
 * @queryParams None
 * @bodyParams {string} [name] - Widget name (max 255 chars)
 * @bodyParams {Object} [config_json] - Widget configuration (JSON object)
 * @returns {Object} Updated dashboard widget
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Dashboard widget not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',
  validateRequest({ params: dashboardWidgetIdParamsSchema, body: updateDashboardWidgetSchema }),

  authenticate(),
  dashboardWidgetController.updateDashboardWidget
);

/**
 * @description Delete dashboard widget (soft delete)
 * @method DELETE
 * @route /api/v1/dashboard-widgets/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Dashboard widget ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Dashboard widget not found
 */
router.delete(
  '/:id',
  validateRequest({ params: dashboardWidgetIdParamsSchema }),

  authenticate(),
  dashboardWidgetController.deleteDashboardWidget
);

module.exports = router;
