/**
 * Lab panel module validation schemas
 *
 * @module modules/lab-panel/schemas
 * @description Zod validation schemas for lab panel endpoints.
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
 * Create lab panel body validation
 * Used for POST /lab-panels endpoint
 */
const createLabPanelSchema = z.object({
  tenant_id: uuidSchema,
  name: z.string().trim().min(1).max(255),
  code: z.string().trim().min(1).max(80).optional().nullable()
});

/**
 * Update lab panel body validation
 * Used for PUT /lab-panels/:id endpoint
 * All fields optional for partial updates
 */
const updateLabPanelSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  code: z.string().trim().min(1).max(80).optional().nullable()
});

// ==================== URL Params ====================

/**
 * Lab panel ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const labPanelIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List lab panels query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with lab panel-specific filters
 */
const listLabPanelsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  name: z.string().trim().optional(),
  code: z.string().trim().optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createLabPanelSchema,
  updateLabPanelSchema,
  labPanelIdParamsSchema,
  listLabPanelsQuerySchema
};
