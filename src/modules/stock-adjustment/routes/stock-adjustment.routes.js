/**
 * Stock adjustment routes
 */

const express = require('express');
const router = express.Router();
const stockAdjustmentController = require('@modules/stock-adjustment/controllers/stock-adjustment.controller');
const validate = require('@middlewares/validate.middleware');
const {
  createStockAdjustmentSchema,
  updateStockAdjustmentSchema,
  stockAdjustmentIdParamsSchema,
  listStockAdjustmentsQuerySchema
} = require('@modules/stock-adjustment/schemas/stock-adjustment.schema');

router.get('/', validate({ query: listStockAdjustmentsQuerySchema }), stockAdjustmentController.listStockAdjustments);
router.get('/:id', validate({ params: stockAdjustmentIdParamsSchema }), stockAdjustmentController.getStockAdjustment);
router.post('/', validate({ body: createStockAdjustmentSchema }), stockAdjustmentController.createStockAdjustment);
router.put('/:id', validate({ params: stockAdjustmentIdParamsSchema, body: updateStockAdjustmentSchema }), stockAdjustmentController.updateStockAdjustment);
router.delete('/:id', validate({ params: stockAdjustmentIdParamsSchema }), stockAdjustmentController.deleteStockAdjustment);

module.exports = router;
