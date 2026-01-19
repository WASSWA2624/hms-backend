/**
 * Lab order module validation schemas
 *
 * @module modules/lab-order/schemas
 * @description Zod validation schemas for lab order endpoints.
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
 * Create lab order body validation
 * Used for POST /lab-orders endpoint
 */
const createLabOrderSchema = z.object({
  encounter_id: uuidSchema.optional().nullable(),
  patient_id: uuidSchema,
  status: z.enum(['ORDERED', 'COLLECTED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED']),
  ordered_at: z.string().datetime().optional()
});

/**
 * Update lab order body validation
 * Used for PUT /lab-orders/:id endpoint
 * All fields optional for partial updates
 */
const updateLabOrderSchema = z.object({
  encounter_id: uuidSchema.optional().nullable(),
  patient_id: uuidSchema.optional(),
  status: z.enum(['ORDERED', 'COLLECTED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED']).optional(),
  ordered_at: z.string().datetime().optional()
});

// ==================== URL Params ====================

/**
 * Lab order ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const labOrderIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List lab orders query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with lab-order-specific filters
 */
const listLabOrdersQuerySchema = listQuerySchema.extend({
  encounter_id: uuidSchema.optional(),
  patient_id: uuidSchema.optional(),
  status: z.enum(['ORDERED', 'COLLECTED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED']).optional(),
  ordered_at_from: z.string().datetime().optional(),
  ordered_at_to: z.string().datetime().optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createLabOrderSchema,
  updateLabOrderSchema,
  labOrderIdParamsSchema,
  listLabOrdersQuerySchema
};
