/**
 * Maintenance request routes
 *
 * @module modules/maintenance-request/routes
 * @description Maintenance request endpoints mounted at /api/v1/maintenance-requests
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const maintenanceRequestController = require('../controllers/maintenance-request.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createMaintenanceRequestSchema,
  updateMaintenanceRequestSchema,
  maintenanceRequestIdParamsSchema,
  listMaintenanceRequestsQuerySchema
} = require('../schemas/maintenance-request.schema');

/**
 * @description List maintenance requests with pagination and filters
 * @method GET
 * @route /api/v1/maintenance-requests/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [facility_id] - Filter by facility ID (UUID)
 * @queryParams {string} [asset_id] - Filter by asset ID (UUID)
 * @queryParams {string} [status] - Filter by status (OPEN, IN_PROGRESS, COMPLETED, CANCELLED)
 * @queryParams {string} [search] - Search in description field
 * @bodyParams None
 * @returns {Object} Paginated list of maintenance requests
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listMaintenanceRequestsQuerySchema }),
  maintenanceRequestController.listMaintenanceRequests
);

/**
 * @description Get maintenance request by ID
 * @method GET
 * @route /api/v1/maintenance-requests/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Maintenance request ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Maintenance request data
 * @throws 401 Unauthorized
 * @throws 404 Maintenance request not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: maintenanceRequestIdParamsSchema }),
  maintenanceRequestController.getMaintenanceRequestById
);

/**
 * @description Create new maintenance request
 * @method POST
 * @route /api/v1/maintenance-requests/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} [facility_id] - Facility ID (optional, UUID)
 * @bodyParams {string} [asset_id] - Asset ID (optional, UUID)
 * @bodyParams {string} status - Status (required, OPEN, IN_PROGRESS, COMPLETED, CANCELLED)
 * @bodyParams {string} [description] - Description text (optional)
 * @bodyParams {string} [reported_at] - Reported datetime (optional, ISO 8601)
 * @bodyParams {string} [resolved_at] - Resolved datetime (optional, ISO 8601)
 * @returns {Object} Created maintenance request
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createMaintenanceRequestSchema }),
  maintenanceRequestController.createMaintenanceRequest
);

/**
 * @description Update maintenance request
 * @method PUT
 * @route /api/v1/maintenance-requests/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Maintenance request ID (UUID)
 * @queryParams None
 * @bodyParams {string} [facility_id] - Facility ID (optional, UUID)
 * @bodyParams {string} [asset_id] - Asset ID (optional, UUID)
 * @bodyParams {string} [status] - Status (optional, OPEN, IN_PROGRESS, COMPLETED, CANCELLED)
 * @bodyParams {string} [description] - Description text (optional)
 * @bodyParams {string} [resolved_at] - Resolved datetime (optional, ISO 8601)
 * @returns {Object} Updated maintenance request
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Maintenance request not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: maintenanceRequestIdParamsSchema, body: updateMaintenanceRequestSchema }),
  maintenanceRequestController.updateMaintenanceRequest
);

/**
 * @description Delete maintenance request (soft delete)
 * @method DELETE
 * @route /api/v1/maintenance-requests/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Maintenance request ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Maintenance request not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: maintenanceRequestIdParamsSchema }),
  maintenanceRequestController.deleteMaintenanceRequest
);

module.exports = router;
