/**
 * Payment routes
 *
 * @module modules/payment/routes
 * @description Payment endpoints mounted at /api/v1/payments
 */

const express = require('express');
const router = express.Router();
const paymentController = require('@controllers/payment/payment.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createPaymentSchema,
  updatePaymentSchema,
  paymentIdParamsSchema,
  listPaymentsQuerySchema
} = require('@validations/payment/payment.schema');

/**
 * @description List payments with pagination and filters
 * @method GET
 * @route /api/v1/payments/
 * @authentication Required (JWT)
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listPaymentsQuerySchema }),
  paymentController.listPayments
);

/**
 * @description Get payment by ID
 * @method GET
 * @route /api/v1/payments/:id
 * @authentication Required (JWT)
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: paymentIdParamsSchema }),
  paymentController.getPaymentById
);

/**
 * @description Create payment
 * @method POST
 * @route /api/v1/payments/
 * @authentication Required (JWT)
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createPaymentSchema }),
  paymentController.createPayment
);

/**
 * @description Update payment
 * @method PUT
 * @route /api/v1/payments/:id
 * @authentication Required (JWT)
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: paymentIdParamsSchema, body: updatePaymentSchema }),
  paymentController.updatePayment
);

/**
 * @description Delete payment (soft delete)
 * @method DELETE
 * @route /api/v1/payments/:id
 * @authentication Required (JWT)
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: paymentIdParamsSchema }),
  paymentController.deletePayment
);

module.exports = router;

