/**
 * Invoice item routes
 *
 * @module modules/invoice-item/routes
 * @description Invoice item endpoints mounted at /api/v1/invoice-items
 */

const express = require('express');
const router = express.Router();
const invoiceItemController = require('@controllers/invoice-item/invoice-item.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createInvoiceItemSchema,
  updateInvoiceItemSchema,
  invoiceItemIdParamsSchema,
  listInvoiceItemsQuerySchema
} = require('@validations/invoice-item/invoice-item.schema');

/**
 * @description List invoice items with pagination and filters
 * @method GET
 * @route /api/v1/invoice-items/
 * @authentication Required (JWT)
 */
router.get(
  '/',  validateRequest({ query: listInvoiceItemsQuerySchema }),

  authenticate(),
  invoiceItemController.listInvoiceItems
);

/**
 * @description Get invoice item by ID
 * @method GET
 * @route /api/v1/invoice-items/:id
 * @authentication Required (JWT)
 */
router.get(
  '/:id',  validateRequest({ params: invoiceItemIdParamsSchema }),

  authenticate(),
  invoiceItemController.getInvoiceItemById
);

/**
 * @description Create invoice item
 * @method POST
 * @route /api/v1/invoice-items/
 * @authentication Required (JWT)
 */
router.post(
  '/',  validateRequest({ body: createInvoiceItemSchema }),

  authenticate(),
  invoiceItemController.createInvoiceItem
);

/**
 * @description Update invoice item
 * @method PUT
 * @route /api/v1/invoice-items/:id
 * @authentication Required (JWT)
 */
router.put(
  '/:id',  validateRequest({ params: invoiceItemIdParamsSchema, body: updateInvoiceItemSchema }),

  authenticate(),
  invoiceItemController.updateInvoiceItem
);

/**
 * @description Delete invoice item (soft delete)
 * @method DELETE
 * @route /api/v1/invoice-items/:id
 * @authentication Required (JWT)
 */
router.delete(
  '/:id',  validateRequest({ params: invoiceItemIdParamsSchema }),

  authenticate(),
  invoiceItemController.deleteInvoiceItem
);

module.exports = router;

