/**
 * Pharmacy order module validation schemas
 *
 * @module modules/pharmacy-order/schemas
 * @description Zod validation schemas for pharmacy order endpoints.
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
 * Create pharmacy order body validation
 * Used for POST /pharmacy-orders endpoint
 */
const createPharmacyOrderSchema = z.object({
  encounter_id: uuidSchema.optional().nullable(),
  patient_id: uuidSchema,
  status: z.enum(['ORDERED', 'DISPENSED', 'PARTIALLY_DISPENSED', 'CANCELLED']).optional(),
  ordered_at: z.string().datetime().optional()
});

/**
 * Update pharmacy order body validation
 * Used for PUT /pharmacy-orders/:id endpoint
 * All fields optional for partial updates
 */
const updatePharmacyOrderSchema = z.object({
  encounter_id: uuidSchema.optional().nullable(),
  patient_id: uuidSchema.optional(),
  status: z.enum(['ORDERED', 'DISPENSED', 'PARTIALLY_DISPENSED', 'CANCELLED']).optional(),
  ordered_at: z.string().datetime().optional()
});

// ==================== URL Params ====================

/**
 * Pharmacy order ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const pharmacyOrderIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List pharmacy orders query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with pharmacy order-specific filters
 */
const listPharmacyOrdersQuerySchema = listQuerySchema.extend({
  encounter_id: uuidSchema.optional(),
  patient_id: uuidSchema.optional(),
  status: z.enum(['ORDERED', 'DISPENSED', 'PARTIALLY_DISPENSED', 'CANCELLED']).optional(),
  ordered_at_from: z.string().datetime().optional(),
  ordered_at_to: z.string().datetime().optional()
});

module.exports = {
  createPharmacyOrderSchema,
  updatePharmacyOrderSchema,
  pharmacyOrderIdParamsSchema,
  listPharmacyOrdersQuerySchema
};
