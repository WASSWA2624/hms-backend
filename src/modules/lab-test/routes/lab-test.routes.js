/**
 * Lab test routes
 *
 * @module modules/lab-test/routes
 * @description Lab test endpoints mounted at /api/v1/lab-tests
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const labTestController = require('@controllers/lab-test/lab-test.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createLabTestSchema,
  updateLabTestSchema,
  labTestIdParamsSchema,
  listLabTestsQuerySchema
} = require('@validations/lab-test/lab-test.schema');

/**
 * @description List lab tests with pagination and filters
 * @method GET
 * @route /api/v1/lab-tests/
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
 * @returns {Object} Paginated list of lab tests
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listLabTestsQuerySchema }),
  labTestController.listLabTests
);

/**
 * @description Get lab test by ID
 * @method GET
 * @route /api/v1/lab-tests/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab test ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Lab test data
 * @throws 401 Unauthorized
 * @throws 404 Lab test not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: labTestIdParamsSchema }),
  labTestController.getLabTestById
);

/**
 * @description Create new lab test
 * @method POST
 * @route /api/v1/lab-tests/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} name - Lab test name (required, max 255 chars)
 * @bodyParams {string} [code] - Lab test code (max 80 chars)
 * @bodyParams {string} [unit] - Unit of measurement (max 40 chars)
 * @bodyParams {string} [reference_range] - Reference range (max 120 chars)
 * @returns {Object} Created lab test
 * @throws 400 Validation error
 * @throws 401 Unauthorized
 * @throws 409 Conflict (duplicate code)
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createLabTestSchema }),
  labTestController.createLabTest
);

/**
 * @description Update lab test
 * @method PUT
 * @route /api/v1/lab-tests/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab test ID (UUID)
 * @queryParams None
 * @bodyParams {string} [name] - Lab test name (max 255 chars)
 * @bodyParams {string} [code] - Lab test code (max 80 chars)
 * @bodyParams {string} [unit] - Unit of measurement (max 40 chars)
 * @bodyParams {string} [reference_range] - Reference range (max 120 chars)
 * @returns {Object} Updated lab test
 * @throws 400 Validation error
 * @throws 401 Unauthorized
 * @throws 404 Lab test not found
 * @throws 409 Conflict (duplicate code)
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: labTestIdParamsSchema, body: updateLabTestSchema }),
  labTestController.updateLabTest
);

/**
 * @description Soft delete lab test
 * @method DELETE
 * @route /api/v1/lab-tests/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab test ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {null} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Lab test not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: labTestIdParamsSchema }),
  labTestController.deleteLabTest
);

module.exports = router;
