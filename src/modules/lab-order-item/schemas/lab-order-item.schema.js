/**
 * Lab order item module validation schemas
 *
 * @module modules/lab-order-item/schemas
 * @description Zod validation schemas for lab order item endpoints.
 * Per validation.mdc: Use Zod exclusively for all validation
 * Per module-creation.mdc: Define schemas for body, params, and query
 */

const { z } = require('zod');
const { 
  uuidSchema, 
  listQuerySchema
} = require('@lib/validation/zod');

// ==================== Body Schemas ====================

/**
 * Create lab order item body validation
 * Used for POST /lab-order-items endpoint
 */
const createLabOrderItemSchema = z.object({
  lab_order_id: uuidSchema,
  lab_test_id: uuidSchema,
  status: z.enum(['ORDERED', 'COLLECTED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED'])
});

/**
 * Update lab order item body validation
 * Used for PUT /lab-order-items/:id endpoint
 * All fields optional for partial updates
 */
const updateLabOrderItemSchema = z.object({
  lab_order_id: uuidSchema.optional(),
  lab_test_id: uuidSchema.optional(),
  status: z.enum(['ORDERED', 'COLLECTED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED']).optional()
});

// ==================== URL Params ====================

/**
 * Lab order item ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const labOrderItemIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List lab order items query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with lab-order-item-specific filters
 */
const listLabOrderItemsQuerySchema = listQuerySchema.extend({
  lab_order_id: uuidSchema.optional(),
  lab_test_id: uuidSchema.optional(),
  status: z.enum(['ORDERED', 'COLLECTED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED']).optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createLabOrderItemSchema,
  updateLabOrderItemSchema,
  labOrderItemIdParamsSchema,
  listLabOrderItemsQuerySchema
};
