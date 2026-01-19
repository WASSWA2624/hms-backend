/**
 * Stock movement routes
 *
 * @module modules/stock-movement/routes
 * @description Stock movement endpoints mounted at /api/v1/stock-movements
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const stockMovementController = require('../controllers/stock-movement.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createStockMovementSchema,
  updateStockMovementSchema,
  stockMovementIdParamsSchema,
  listStockMovementsQuerySchema
} = require('../schemas/stock-movement.schema');

/**
 * @description List stock movements with pagination and filters
 * @method GET
 * @route /api/v1/stock-movements/
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listStockMovementsQuerySchema }),
  stockMovementController.listStockMovements
);

/**
 * @description Get stock movement by ID
 * @method GET
 * @route /api/v1/stock-movements/:id
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: stockMovementIdParamsSchema }),
  stockMovementController.getStockMovementById
);

/**
 * @description Create new stock movement
 * @method POST
 * @route /api/v1/stock-movements/
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createStockMovementSchema }),
  stockMovementController.createStockMovement
);

/**
 * @description Update stock movement
 * @method PUT
 * @route /api/v1/stock-movements/:id
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: stockMovementIdParamsSchema, body: updateStockMovementSchema }),
  stockMovementController.updateStockMovement
);

/**
 * @description Delete stock movement (soft delete)
 * @method DELETE
 * @route /api/v1/stock-movements/:id
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: stockMovementIdParamsSchema }),
  stockMovementController.deleteStockMovement
);

module.exports = router;
