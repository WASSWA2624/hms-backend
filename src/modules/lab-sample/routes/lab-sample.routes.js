/**
 * Lab sample routes
 *
 * @module modules/lab-sample/routes
 * @description Lab sample endpoints mounted at /api/v1/lab-samples
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const labSampleController = require('@controllers/lab-sample/lab-sample.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createLabSampleSchema,
  updateLabSampleSchema,
  labSampleIdParamsSchema,
  listLabSamplesQuerySchema
} = require('@validations/lab-sample/lab-sample.schema');

/**
 * @description List lab samples with pagination and filters
 * @method GET
 * @route /api/v1/lab-samples/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [lab_order_id] - Filter by lab order ID (UUID)
 * @queryParams {string} [status] - Filter by status (PENDING, COLLECTED, REJECTED, RECEIVED)
 * @bodyParams None
 * @returns {Object} Paginated list of lab samples
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listLabSamplesQuerySchema }),

  authenticate(),
  labSampleController.listLabSamples
);

/**
 * @description Get lab sample by ID
 * @method GET
 * @route /api/v1/lab-samples/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab sample ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Lab sample data
 * @throws 401 Unauthorized
 * @throws 404 Lab sample not found
 */
router.get(
  '/:id',  validateRequest({ params: labSampleIdParamsSchema }),

  authenticate(),
  labSampleController.getLabSampleById
);

/**
 * @description Create new lab sample
 * @method POST
 * @route /api/v1/lab-samples/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} lab_order_id - Lab order ID (required, UUID)
 * @bodyParams {string} status - Status (required, PENDING/COLLECTED/REJECTED/RECEIVED)
 * @bodyParams {string} [collected_at] - Collection timestamp (ISO 8601 datetime)
 * @bodyParams {string} [received_at] - Received timestamp (ISO 8601 datetime)
 * @returns {Object} Created lab sample
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',  validateRequest({ body: createLabSampleSchema }),

  authenticate(),
  labSampleController.createLabSample
);

/**
 * @description Update lab sample
 * @method PUT
 * @route /api/v1/lab-samples/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab sample ID (UUID)
 * @queryParams None
 * @bodyParams {string} [status] - Status (PENDING/COLLECTED/REJECTED/RECEIVED)
 * @bodyParams {string} [collected_at] - Collection timestamp (ISO 8601 datetime)
 * @bodyParams {string} [received_at] - Received timestamp (ISO 8601 datetime)
 * @returns {Object} Updated lab sample
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Lab sample not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: labSampleIdParamsSchema, body: updateLabSampleSchema }),

  authenticate(),
  labSampleController.updateLabSample
);

/**
 * @description Delete lab sample (soft delete)
 * @method DELETE
 * @route /api/v1/lab-samples/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab sample ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Lab sample not found
 */
router.delete(
  '/:id',  validateRequest({ params: labSampleIdParamsSchema }),

  authenticate(),
  labSampleController.deleteLabSample
);

module.exports = router;
