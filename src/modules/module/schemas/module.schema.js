/**
 * Module module validation schemas
 *
 * @module modules/module/schemas
 * @description Zod validation schemas for module endpoints.
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
 * Create module body validation
 * Used for POST /modules endpoint
 */
const createModuleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().optional().nullable()
});

/**
 * Update module body validation
 * Used for PUT /modules/:id endpoint
 * All fields optional for partial updates
 */
const updateModuleSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().optional().nullable()
});

// ==================== URL Params ====================

/**
 * Module ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const moduleIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List modules query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with module-specific filters
 */
const listModulesQuerySchema = listQuerySchema.extend({
  search: z.string().trim().optional()
});

module.exports = {
  createModuleSchema,
  updateModuleSchema,
  moduleIdParamsSchema,
  listModulesQuerySchema
};
