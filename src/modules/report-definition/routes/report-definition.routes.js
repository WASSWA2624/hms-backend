/**
 * Report definition routes
 *
 * @module modules/report-definition/routes
 * @description Report definition endpoints mounted at /api/v1/report-definitions
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const reportDefinitionController = require('@controllers/report-definition/report-definition.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createReportDefinitionSchema,
  updateReportDefinitionSchema,
  reportDefinitionIdParamsSchema,
  listReportDefinitionsQuerySchema
} = require('@validations/report-definition/report-definition.schema');

/**
 * @description List report definitions with pagination and filters
 * @method GET
 * @route /api/v1/report-definitions/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [facility_id] - Filter by facility ID (UUID)
 * @queryParams {string} [created_by] - Filter by creator ID (UUID)
 * @queryParams {string} [search] - Search by name or description
 * @bodyParams None
 * @returns {Object} Paginated list of report definitions
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listReportDefinitionsQuerySchema }),
  reportDefinitionController.listReportDefinitions
);

/**
 * @description Get report definition by ID
 * @method GET
 * @route /api/v1/report-definitions/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Report definition ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Report definition data
 * @throws 401 Unauthorized
 * @throws 404 Report definition not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: reportDefinitionIdParamsSchema }),
  reportDefinitionController.getReportDefinitionById
);

/**
 * @description Create new report definition
 * @method POST
 * @route /api/v1/report-definitions/
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} [facility_id] - Facility ID (UUID)
 * @bodyParams {string} name - Report name (required, max 120 chars)
 * @bodyParams {string} [description] - Report description
 * @bodyParams {Object} query_json - Query configuration JSON (required)
 * @bodyParams {Object} [parameters] - Parameters schema JSON
 * @returns {Object} Created report definition
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createReportDefinitionSchema }),
  reportDefinitionController.createReportDefinition
);

/**
 * @description Update report definition
 * @method PUT
 * @route /api/v1/report-definitions/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams {string} id - Report definition ID (UUID)
 * @queryParams None
 * @bodyParams {string} [facility_id] - Facility ID (UUID)
 * @bodyParams {string} [name] - Report name (max 120 chars)
 * @bodyParams {string} [description] - Report description
 * @bodyParams {Object} [query_json] - Query configuration JSON
 * @bodyParams {Object} [parameters] - Parameters schema JSON
 * @returns {Object} Updated report definition
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Report definition not found
 * @throws 400 Foreign key constraint violation
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: reportDefinitionIdParamsSchema, body: updateReportDefinitionSchema }),
  reportDefinitionController.updateReportDefinition
);

/**
 * @description Delete report definition (soft delete)
 * @method DELETE
 * @route /api/v1/report-definitions/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams {string} id - Report definition ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Report definition not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: reportDefinitionIdParamsSchema }),
  reportDefinitionController.deleteReportDefinition
);

module.exports = router;
