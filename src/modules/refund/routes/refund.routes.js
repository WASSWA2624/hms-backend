/**
 * Refund routes
 *
 * @module modules/refund/routes
 * @description Refund endpoints mounted at /api/v1/refunds
 */

const express = require('express');
const router = express.Router();
const refundController = require('@controllers/refund/refund.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createRefundSchema,
  updateRefundSchema,
  refundIdParamsSchema,
  listRefundsQuerySchema
} = require('@validations/refund/refund.schema');

/**
 * @description List refunds with pagination and filters
 * @method GET
 * @route /api/v1/refunds/
 * @authentication Required (JWT)
 */
router.get(
  '/',  validateRequest({ query: listRefundsQuerySchema }),

  authenticate(),
  refundController.listRefunds
);

/**
 * @description Get refund by ID
 * @method GET
 * @route /api/v1/refunds/:id
 * @authentication Required (JWT)
 */
router.get(
  '/:id',  validateRequest({ params: refundIdParamsSchema }),

  authenticate(),
  refundController.getRefundById
);

/**
 * @description Create refund
 * @method POST
 * @route /api/v1/refunds/
 * @authentication Required (JWT)
 */
router.post(
  '/',  validateRequest({ body: createRefundSchema }),

  authenticate(),
  refundController.createRefund
);

/**
 * @description Update refund
 * @method PUT
 * @route /api/v1/refunds/:id
 * @authentication Required (JWT)
 */
router.put(
  '/:id',  validateRequest({ params: refundIdParamsSchema, body: updateRefundSchema }),

  authenticate(),
  refundController.updateRefund
);

/**
 * @description Delete refund (soft delete)
 * @method DELETE
 * @route /api/v1/refunds/:id
 * @authentication Required (JWT)
 */
router.delete(
  '/:id',  validateRequest({ params: refundIdParamsSchema }),

  authenticate(),
  refundController.deleteRefund
);

module.exports = router;

