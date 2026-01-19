/**
 * Lab order routes
 *
 * @module modules/lab-order/routes
 * @description Lab order endpoints mounted at /api/v1/lab-orders
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const labOrderController = require('@controllers/lab-order/lab-order.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createLabOrderSchema,
  updateLabOrderSchema,
  labOrderIdParamsSchema,
  listLabOrdersQuerySchema
} = require('@validations/lab-order/lab-order.schema');

/**
 * @description List lab orders with pagination and filters
 * @method GET
 * @route /api/v1/lab-orders/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [encounter_id] - Filter by encounter ID (UUID)
 * @queryParams {string} [patient_id] - Filter by patient ID (UUID)
 * @queryParams {string} [status] - Filter by status (ORDERED, COLLECTED, IN_PROCESS, COMPLETED, CANCELLED)
 * @queryParams {string} [ordered_at_from] - Filter by ordered date from (ISO datetime)
 * @queryParams {string} [ordered_at_to] - Filter by ordered date to (ISO datetime)
 * @queryParams {string} [search] - Search query
 * @bodyParams None
 * @returns {Object} Paginated list of lab orders
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listLabOrdersQuerySchema }),
  labOrderController.listLabOrders
);

/**
 * @description Get lab order by ID
 * @method GET
 * @route /api/v1/lab-orders/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab order ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Lab order data
 * @throws 401 Unauthorized
 * @throws 404 Lab order not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: labOrderIdParamsSchema }),
  labOrderController.getLabOrderById
);

/**
 * @description Create new lab order
 * @method POST
 * @route /api/v1/lab-orders/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} patient_id - Patient ID (required, UUID)
 * @bodyParams {string} [encounter_id] - Encounter ID (UUID)
 * @bodyParams {string} status - Lab order status (required, enum: ORDERED, COLLECTED, IN_PROCESS, COMPLETED, CANCELLED)
 * @bodyParams {string} [ordered_at] - Ordered datetime (ISO datetime)
 * @returns {Object} Created lab order
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createLabOrderSchema }),
  labOrderController.createLabOrder
);

/**
 * @description Update lab order
 * @method PUT
 * @route /api/v1/lab-orders/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab order ID (UUID)
 * @queryParams None
 * @bodyParams {string} [patient_id] - Patient ID (UUID)
 * @bodyParams {string} [encounter_id] - Encounter ID (UUID)
 * @bodyParams {string} [status] - Lab order status (enum: ORDERED, COLLECTED, IN_PROCESS, COMPLETED, CANCELLED)
 * @bodyParams {string} [ordered_at] - Ordered datetime (ISO datetime)
 * @returns {Object} Updated lab order
 * @throws 401 Unauthorized
 * @throws 404 Lab order not found
 * @throws 400 Validation error
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: labOrderIdParamsSchema, body: updateLabOrderSchema }),
  labOrderController.updateLabOrder
);

/**
 * @description Delete lab order (soft delete)
 * @method DELETE
 * @route /api/v1/lab-orders/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab order ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} No content
 * @throws 401 Unauthorized
 * @throws 404 Lab order not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: labOrderIdParamsSchema }),
  labOrderController.deleteLabOrder
);

module.exports = router;
