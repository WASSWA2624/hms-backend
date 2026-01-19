/**
 * Lab panel routes
 *
 * @module modules/lab-panel/routes
 * @description Lab panel endpoints mounted at /api/v1/lab-panels
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const labPanelController = require('@controllers/lab-panel/lab-panel.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createLabPanelSchema,
  updateLabPanelSchema,
  labPanelIdParamsSchema,
  listLabPanelsQuerySchema
} = require('@validations/lab-panel/lab-panel.schema');

/**
 * @description List lab panels with pagination and filters
 * @method GET
 * @route /api/v1/lab-panels/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [name] - Filter by name (partial match)
 * @queryParams {string} [code] - Filter by code (partial match)
 * @queryParams {string} [search] - Search in name and code fields
 * @bodyParams None
 * @returns {Object} Paginated list of lab panels
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listLabPanelsQuerySchema }),
  labPanelController.listLabPanels
);

/**
 * @description Get lab panel by ID
 * @method GET
 * @route /api/v1/lab-panels/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab panel ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Lab panel data
 * @throws 401 Unauthorized
 * @throws 404 Lab panel not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: labPanelIdParamsSchema }),
  labPanelController.getLabPanelById
);

/**
 * @description Create new lab panel
 * @method POST
 * @route /api/v1/lab-panels/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} name - Lab panel name (required, max 255 chars)
 * @bodyParams {string} [code] - Lab panel code (max 80 chars)
 * @returns {Object} Created lab panel
 * @throws 400 Validation error
 * @throws 401 Unauthorized
 * @throws 409 Conflict (duplicate code)
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createLabPanelSchema }),
  labPanelController.createLabPanel
);

/**
 * @description Update lab panel
 * @method PUT
 * @route /api/v1/lab-panels/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab panel ID (UUID)
 * @queryParams None
 * @bodyParams {string} [name] - Lab panel name (max 255 chars)
 * @bodyParams {string} [code] - Lab panel code (max 80 chars)
 * @returns {Object} Updated lab panel
 * @throws 400 Validation error
 * @throws 401 Unauthorized
 * @throws 404 Lab panel not found
 * @throws 409 Conflict (duplicate code)
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: labPanelIdParamsSchema, body: updateLabPanelSchema }),
  labPanelController.updateLabPanel
);

/**
 * @description Soft delete lab panel
 * @method DELETE
 * @route /api/v1/lab-panels/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab panel ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {null} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Lab panel not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: labPanelIdParamsSchema }),
  labPanelController.deleteLabPanel
);

module.exports = router;
