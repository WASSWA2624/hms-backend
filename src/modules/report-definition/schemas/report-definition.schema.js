/**
 * Report definition module validation schemas
 *
 * @module modules/report-definition/schemas
 * @description Zod validation schemas for report definition endpoints.
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
 * Create report definition body validation
 * Used for POST /report-definitions endpoint
 */
const createReportDefinitionSchema = z.object({
  tenant_id: uuidSchema,
  facility_id: uuidSchema.optional().nullable(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().optional().nullable(),
  query_json: z.object({}).passthrough(), // JSON object for query/config
  parameters: z.object({}).passthrough().optional().nullable() // JSON object for parameters schema
});

/**
 * Update report definition body validation
 * Used for PUT /report-definitions/:id endpoint
 * All fields optional for partial updates
 */
const updateReportDefinitionSchema = z.object({
  facility_id: uuidSchema.optional().nullable(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().optional().nullable(),
  query_json: z.object({}).passthrough().optional(),
  parameters: z.object({}).passthrough().optional().nullable()
});

// ==================== URL Params ====================

/**
 * Report definition ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const reportDefinitionIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List report definitions query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with report definition-specific filters
 */
const listReportDefinitionsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  facility_id: uuidSchema.optional(),
  created_by: uuidSchema.optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createReportDefinitionSchema,
  updateReportDefinitionSchema,
  reportDefinitionIdParamsSchema,
  listReportDefinitionsQuerySchema
};
