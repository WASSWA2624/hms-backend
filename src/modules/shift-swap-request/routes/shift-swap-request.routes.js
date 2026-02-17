/**
 * Shift swap request routes
 *
 * @module modules/shift-swap-request/routes
 * @description Shift swap request endpoints mounted at /api/v1/shift-swap-requests
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const shiftSwapRequestController = require('@controllers/shift-swap-request/shift-swap-request.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createShiftSwapRequestSchema,
  updateShiftSwapRequestSchema,
  shiftSwapRequestIdParamsSchema,
  listShiftSwapRequestsQuerySchema
} = require('@validations/shift-swap-request/shift-swap-request.schema');

/**
 * @description List shift swap requests with pagination and filters
 * @method GET
 * @route /api/v1/shift-swap-requests/
 * @authentication Required (JWT)
 */
router.get(
  '/',  validateRequest({ query: listShiftSwapRequestsQuerySchema }),

  authenticate(),
  shiftSwapRequestController.listShiftSwapRequests
);

/**
 * @description Get shift swap request by ID
 * @method GET
 * @route /api/v1/shift-swap-requests/:id
 * @authentication Required (JWT)
 */
router.get(
  '/:id',  validateRequest({ params: shiftSwapRequestIdParamsSchema }),

  authenticate(),
  shiftSwapRequestController.getShiftSwapRequestById
);

/**
 * @description Create new shift swap request
 * @method POST
 * @route /api/v1/shift-swap-requests/
 * @authentication Required (JWT)
 */
router.post(
  '/',  validateRequest({ body: createShiftSwapRequestSchema }),

  authenticate(),
  shiftSwapRequestController.createShiftSwapRequest
);

/**
 * @description Update shift swap request
 * @method PUT
 * @route /api/v1/shift-swap-requests/:id
 * @authentication Required (JWT)
 */
router.put(
  '/:id',  validateRequest({ params: shiftSwapRequestIdParamsSchema, body: updateShiftSwapRequestSchema }),

  authenticate(),
  shiftSwapRequestController.updateShiftSwapRequest
);

/**
 * @description Delete shift swap request (soft delete)
 * @method DELETE
 * @route /api/v1/shift-swap-requests/:id
 * @authentication Required (JWT)
 */
router.delete(
  '/:id',  validateRequest({ params: shiftSwapRequestIdParamsSchema }),

  authenticate(),
  shiftSwapRequestController.deleteShiftSwapRequest
);

module.exports = router;
