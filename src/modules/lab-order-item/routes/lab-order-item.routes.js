/**
 * Lab order item routes
 *
 * @module modules/lab-order-item/routes
 * @description Lab order item endpoints mounted at /api/v1/lab-order-items
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const labOrderItemController = require('@controllers/lab-order-item/lab-order-item.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createLabOrderItemSchema,
  updateLabOrderItemSchema,
  labOrderItemIdParamsSchema,
  listLabOrderItemsQuerySchema
} = require('@validations/lab-order-item/lab-order-item.schema');

/**
 * @description List lab order items with pagination and filters
 * @method GET
 * @route /api/v1/lab-order-items/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [lab_order_id] - Filter by lab order ID (UUID)
 * @queryParams {string} [lab_test_id] - Filter by lab test ID (UUID)
 * @queryParams {string} [status] - Filter by status (ORDERED, COLLECTED, IN_PROCESS, COMPLETED, CANCELLED)
 * @queryParams {string} [search] - Search query
 * @bodyParams None
 * @returns {Object} Paginated list of lab order items
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listLabOrderItemsQuerySchema }),

  authenticate(),
  labOrderItemController.listLabOrderItems
);

/**
 * @description Get lab order item by ID
 * @method GET
 * @route /api/v1/lab-order-items/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab order item ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Lab order item data
 * @throws 401 Unauthorized
 * @throws 404 Lab order item not found
 */
router.get(
  '/:id',  validateRequest({ params: labOrderItemIdParamsSchema }),

  authenticate(),
  labOrderItemController.getLabOrderItemById
);

/**
 * @description Create new lab order item
 * @method POST
 * @route /api/v1/lab-order-items/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} lab_order_id - Lab order ID (required, UUID)
 * @bodyParams {string} lab_test_id - Lab test ID (required, UUID)
 * @bodyParams {string} status - Lab order item status (required, enum: ORDERED, COLLECTED, IN_PROCESS, COMPLETED, CANCELLED)
 * @returns {Object} Created lab order item
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 */
router.post(
  '/',  validateRequest({ body: createLabOrderItemSchema }),

  authenticate(),
  labOrderItemController.createLabOrderItem
);

/**
 * @description Update lab order item
 * @method PUT
 * @route /api/v1/lab-order-items/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab order item ID (UUID)
 * @queryParams None
 * @bodyParams {string} [lab_order_id] - Lab order ID (UUID)
 * @bodyParams {string} [lab_test_id] - Lab test ID (UUID)
 * @bodyParams {string} [status] - Lab order item status (enum: ORDERED, COLLECTED, IN_PROCESS, COMPLETED, CANCELLED)
 * @returns {Object} Updated lab order item
 * @throws 401 Unauthorized
 * @throws 404 Lab order item not found
 * @throws 400 Validation error
 */
router.put(
  '/:id',  validateRequest({ params: labOrderItemIdParamsSchema, body: updateLabOrderItemSchema }),

  authenticate(),
  labOrderItemController.updateLabOrderItem
);

/**
 * @description Delete lab order item (soft delete)
 * @method DELETE
 * @route /api/v1/lab-order-items/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Lab order item ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} No content
 * @throws 401 Unauthorized
 * @throws 404 Lab order item not found
 */
router.delete(
  '/:id',  validateRequest({ params: labOrderItemIdParamsSchema }),

  authenticate(),
  labOrderItemController.deleteLabOrderItem
);

module.exports = router;
