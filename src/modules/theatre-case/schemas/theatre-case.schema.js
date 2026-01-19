/**
 * Theatre case module validation schemas
 *
 * @module modules/theatre-case/schemas
 * @description Zod validation schemas for theatre case endpoints.
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
 * Create theatre case body validation
 * Used for POST /theatre-cases endpoint
 */
const createTheatreCaseSchema = z.object({
  encounter_id: uuidSchema,
  scheduled_at: z.string().datetime(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
});

/**
 * Update theatre case body validation
 * Used for PUT /theatre-cases/:id endpoint
 * All fields optional for partial updates
 */
const updateTheatreCaseSchema = z.object({
  encounter_id: uuidSchema.optional(),
  scheduled_at: z.string().datetime().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional()
});

// ==================== URL Params ====================

/**
 * Theatre case ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const theatreCaseIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List theatre cases query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with theatre case-specific filters
 */
const listTheatreCasesQuerySchema = listQuerySchema.extend({
  encounter_id: uuidSchema.optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  scheduled_from: z.string().datetime().optional(),
  scheduled_to: z.string().datetime().optional()
});

module.exports = {
  createTheatreCaseSchema,
  updateTheatreCaseSchema,
  theatreCaseIdParamsSchema,
  listTheatreCasesQuerySchema
};
