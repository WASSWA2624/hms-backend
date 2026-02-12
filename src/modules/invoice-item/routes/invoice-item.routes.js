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
  '/',
  authenticate(),
  validateRequest({ query: listInvoiceItemsQuerySchema }),
  invoiceItemController.listInvoiceItems
);

/**
 * @description Get invoice item by ID
 * @method GET
 * @route /api/v1/invoice-items/:id
 * @authentication Required (JWT)
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: invoiceItemIdParamsSchema }),
  invoiceItemController.getInvoiceItemById
);

/**
 * @description Create invoice item
 * @method POST
 * @route /api/v1/invoice-items/
 * @authentication Required (JWT)
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createInvoiceItemSchema }),
  invoiceItemController.createInvoiceItem
);

/**
 * @description Update invoice item
 * @method PUT
 * @route /api/v1/invoice-items/:id
 * @authentication Required (JWT)
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: invoiceItemIdParamsSchema, body: updateInvoiceItemSchema }),
  invoiceItemController.updateInvoiceItem
);

/**
 * @description Delete invoice item (soft delete)
 * @method DELETE
 * @route /api/v1/invoice-items/:id
 * @authentication Required (JWT)
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: invoiceItemIdParamsSchema }),
  invoiceItemController.deleteInvoiceItem
);

module.exports = router;

