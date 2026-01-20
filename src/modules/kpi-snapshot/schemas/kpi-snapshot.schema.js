/**
 * KPI snapshot module validation schemas
 *
 * @module modules/kpi-snapshot/schemas
 * @description Zod validation schemas for KPI snapshot endpoints.
 * Per validation.mdc: Use Zod exclusively for all validation
 * Per module-creation.mdc: Define schemas for body, params, and query
 */

const { z } = require('zod');
const { 
  uuidSchema, 
  listQuerySchema,
  isoDateSchema
} = require('@lib/validation/zod');

// ==================== Body Schemas ====================

/**
 * Create KPI snapshot body validation
 * Used for POST /kpi-snapshots endpoint
 */
const createKpiSnapshotSchema = z.object({
  tenant_id: uuidSchema,
  name: z.string().trim().min(1).max(255),
  value: z.string().trim().regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid decimal number with up to 4 decimal places'),
  recorded_at: isoDateSchema.optional()
});

/**
 * Update KPI snapshot body validation
 * Used for PUT /kpi-snapshots/:id endpoint
 * All fields optional for partial updates
 */
const updateKpiSnapshotSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  value: z.string().trim().regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid decimal number with up to 4 decimal places').optional(),
  recorded_at: isoDateSchema.optional()
});

// ==================== URL Params ====================

/**
 * KPI snapshot ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const kpiSnapshotIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List KPI snapshots query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with kpi-snapshot-specific filters
 */
const listKpiSnapshotsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  name: z.string().trim().optional(),
  search: z.string().trim().optional(),
  recorded_at_from: isoDateSchema.optional(),
  recorded_at_to: isoDateSchema.optional()
});

module.exports = {
  createKpiSnapshotSchema,
  updateKpiSnapshotSchema,
  kpiSnapshotIdParamsSchema,
  listKpiSnapshotsQuerySchema
};
