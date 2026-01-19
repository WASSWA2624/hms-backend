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
  '/',
  authenticate(),
  validateRequest({ query: listShiftSwapRequestsQuerySchema }),
  shiftSwapRequestController.listShiftSwapRequests
);

/**
 * @description Get shift swap request by ID
 * @method GET
 * @route /api/v1/shift-swap-requests/:id
 * @authentication Required (JWT)
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: shiftSwapRequestIdParamsSchema }),
  shiftSwapRequestController.getShiftSwapRequestById
);

/**
 * @description Create new shift swap request
 * @method POST
 * @route /api/v1/shift-swap-requests/
 * @authentication Required (JWT)
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createShiftSwapRequestSchema }),
  shiftSwapRequestController.createShiftSwapRequest
);

/**
 * @description Update shift swap request
 * @method PUT
 * @route /api/v1/shift-swap-requests/:id
 * @authentication Required (JWT)
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: shiftSwapRequestIdParamsSchema, body: updateShiftSwapRequestSchema }),
  shiftSwapRequestController.updateShiftSwapRequest
);

/**
 * @description Delete shift swap request (soft delete)
 * @method DELETE
 * @route /api/v1/shift-swap-requests/:id
 * @authentication Required (JWT)
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: shiftSwapRequestIdParamsSchema }),
  shiftSwapRequestController.deleteShiftSwapRequest
);

module.exports = router;
