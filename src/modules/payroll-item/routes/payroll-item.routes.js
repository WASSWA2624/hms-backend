/**
 * Payroll item routes
 *
 * @module modules/payroll-item/routes
 * @description Payroll item endpoints mounted at /api/v1/payroll-items
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const payrollItemController = require('@controllers/payroll-item/payroll-item.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createPayrollItemSchema,
  updatePayrollItemSchema,
  payrollItemIdParamsSchema,
  listPayrollItemsQuerySchema
} = require('@validations/payroll-item/payroll-item.schema');

/**
 * @description List payroll items with pagination and filters
 * @method GET
 * @route /api/v1/payroll-items/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [payroll_run_id] - Filter by payroll run ID (UUID)
 * @queryParams {string} [staff_profile_id] - Filter by staff profile ID (UUID)
 * @queryParams {string} [currency] - Filter by currency code
 * @queryParams {number} [amount_min] - Filter by minimum amount
 * @queryParams {number} [amount_max] - Filter by maximum amount
 * @bodyParams None
 * @returns {Object} Paginated list of payroll items
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listPayrollItemsQuerySchema }),

  authenticate(),
  payrollItemController.listPayrollItems
);

/**
 * @description Get payroll item by ID
 * @method GET
 * @route /api/v1/payroll-items/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Payroll item ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Payroll item data
 * @throws 401 Unauthorized
 * @throws 404 Payroll item not found
 */
router.get(
  '/:id',  validateRequest({ params: payrollItemIdParamsSchema }),

  authenticate(),
  payrollItemController.getPayrollItemById
);

/**
 * @description Create new payroll item
 * @method POST
 * @route /api/v1/payroll-items/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} payroll_run_id - Payroll run ID (required, UUID)
 * @bodyParams {string} staff_profile_id - Staff profile ID (required, UUID)
 * @bodyParams {number} amount - Amount (required, >= 0)
 * @bodyParams {string} currency - Currency code (required, max 10 chars)
 * @returns {Object} Created payroll item
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',  validateRequest({ body: createPayrollItemSchema }),

  authenticate(),
  payrollItemController.createPayrollItem
);

/**
 * @description Update payroll item
 * @method PUT
 * @route /api/v1/payroll-items/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Payroll item ID (UUID)
 * @queryParams None
 * @bodyParams {string} [payroll_run_id] - Payroll run ID (UUID)
 * @bodyParams {string} [staff_profile_id] - Staff profile ID (UUID)
 * @bodyParams {number} [amount] - Amount (>= 0)
 * @bodyParams {string} [currency] - Currency code (max 10 chars)
 * @returns {Object} Updated payroll item
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Payroll item not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: payrollItemIdParamsSchema, body: updatePayrollItemSchema }),

  authenticate(),
  payrollItemController.updatePayrollItem
);

/**
 * @description Delete payroll item (soft delete)
 * @method DELETE
 * @route /api/v1/payroll-items/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Payroll item ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Payroll item not found
 */
router.delete(
  '/:id',  validateRequest({ params: payrollItemIdParamsSchema }),

  authenticate(),
  payrollItemController.deletePayrollItem
);

module.exports = router;
