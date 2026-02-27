/**
 * Radiology Order module validation schemas
 *
 * @module modules/radiology-order/schemas
 * @description Zod validation schemas for radiology-order endpoints.
 * Per validation.mdc: Use Zod exclusively for all validation
 * Per module-creation.mdc: Define schemas for body, params, and query
 */

const { z } = require('zod');
const { 
  uuidOrFriendlyIdentifierSchema, 
  listQuerySchema
} = require('@lib/validation/zod');

// ==================== Body Schemas ====================

/**
 * Create radiology order body validation
 * Used for POST /radiology-orders endpoint
 */
const createRadiologyOrderSchema = z.object({
  encounter_id: uuidOrFriendlyIdentifierSchema.optional().nullable(),
  patient_id: uuidOrFriendlyIdentifierSchema,
  radiology_test_id: uuidOrFriendlyIdentifierSchema.optional().nullable(),
  status: z.enum(['ORDERED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED']),
  ordered_at: z.string().datetime().optional()
});

/**
 * Update radiology order body validation
 * Used for PUT /radiology-orders/:id endpoint
 * All fields optional for partial updates
 */
const updateRadiologyOrderSchema = z.object({
  encounter_id: uuidOrFriendlyIdentifierSchema.optional().nullable(),
  patient_id: uuidOrFriendlyIdentifierSchema.optional(),
  radiology_test_id: uuidOrFriendlyIdentifierSchema.optional().nullable(),
  status: z.enum(['ORDERED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED']).optional(),
  ordered_at: z.string().datetime().optional()
});

// ==================== URL Params ====================

/**
 * Radiology Order ID URL parameter validation
 * Used for GET /:id, PUT /:id, DELETE /:id endpoints
 */
const radiologyOrderIdParamsSchema = z.object({
  id: uuidOrFriendlyIdentifierSchema
});

// ==================== Query Params ====================

/**
 * List radiology orders query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with radiology-order-specific filters
 */
const listRadiologyOrdersQuerySchema = listQuerySchema.extend({
  encounter_id: uuidOrFriendlyIdentifierSchema.optional(),
  patient_id: uuidOrFriendlyIdentifierSchema.optional(),
  radiology_test_id: uuidOrFriendlyIdentifierSchema.optional(),
  status: z.enum(['ORDERED', 'IN_PROCESS', 'COMPLETED', 'CANCELLED']).optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createRadiologyOrderSchema,
  updateRadiologyOrderSchema,
  radiologyOrderIdParamsSchema,
  listRadiologyOrdersQuerySchema
};
