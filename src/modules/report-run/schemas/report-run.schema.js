/**
 * Report run module validation schemas
 *
 * @module modules/report-run/schemas
 * @description Zod validation schemas for report run endpoints.
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
 * Create report run body validation
 * Used for POST /report-runs endpoint
 */
const createReportRunSchema = z.object({
  tenant_id: uuidSchema,
  report_definition_id: uuidSchema,
  format: z.enum(['PDF', 'EXCEL', 'CSV', 'JSON']),
  parameters: z.object({}).passthrough().optional().nullable() // JSON object for actual parameter values
});

/**
 * Update report run body validation
 * Used for PUT /report-runs/:id endpoint
 * All fields optional for partial updates
 */
const updateReportRunSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  file_path: z.string().trim().max(255).optional().nullable(),
  error_message: z.string().trim().optional().nullable(),
  started_at: z.string().datetime().optional().nullable(),
  completed_at: z.string().datetime().optional().nullable()
});

// ==================== URL Params ====================

/**
 * Report run ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const reportRunIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List report runs query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with report run-specific filters
 */
const listReportRunsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  report_definition_id: uuidSchema.optional(),
  format: z.enum(['PDF', 'EXCEL', 'CSV', 'JSON']).optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  created_by: uuidSchema.optional()
});

module.exports = {
  createReportRunSchema,
  updateReportRunSchema,
  reportRunIdParamsSchema,
  listReportRunsQuerySchema
};
