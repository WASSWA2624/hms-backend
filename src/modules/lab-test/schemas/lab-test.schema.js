/**
 * Lab test module validation schemas
 *
 * @module modules/lab-test/schemas
 * @description Zod validation schemas for lab test endpoints.
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
 * Create lab test body validation
 * Used for POST /lab-tests endpoint
 */
const createLabTestSchema = z.object({
  tenant_id: uuidSchema,
  name: z.string().trim().min(1).max(255),
  code: z.string().trim().min(1).max(80).optional().nullable(),
  unit: z.string().trim().min(1).max(40).optional().nullable(),
  reference_range: z.string().trim().min(1).max(120).optional().nullable()
});

/**
 * Update lab test body validation
 * Used for PUT /lab-tests/:id endpoint
 * All fields optional for partial updates
 */
const updateLabTestSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  code: z.string().trim().min(1).max(80).optional().nullable(),
  unit: z.string().trim().min(1).max(40).optional().nullable(),
  reference_range: z.string().trim().min(1).max(120).optional().nullable()
});

// ==================== URL Params ====================

/**
 * Lab test ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const labTestIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List lab tests query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with lab test-specific filters
 */
const listLabTestsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  name: z.string().trim().optional(),
  code: z.string().trim().optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createLabTestSchema,
  updateLabTestSchema,
  labTestIdParamsSchema,
  listLabTestsQuerySchema
};
