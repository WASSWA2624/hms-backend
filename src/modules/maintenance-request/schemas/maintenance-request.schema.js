/**
 * Maintenance request module validation schemas
 *
 * @module modules/maintenance-request/schemas
 * @description Zod validation schemas for maintenance request endpoints.
 * Per validation.mdc: Use Zod exclusively for all validation
 * Per module-creation.mdc: Define schemas for body, params, and query
 */

const { z } = require('zod');
const { 
  uuidSchema, 
  listQuerySchema
} = require('@lib/validation/zod');

// ==================== Enums ====================

/**
 * Maintenance status enum (matches Prisma schema)
 * Enum values: OPEN, IN_PROGRESS, COMPLETED, CANCELLED
 */
const maintenanceStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

// ==================== Body Schemas ====================

/**
 * Create maintenance request body validation
 * Used for POST /maintenance-requests endpoint
 */
const createMaintenanceRequestSchema = z.object({
  facility_id: uuidSchema.optional().nullable(),
  asset_id: uuidSchema.optional().nullable(),
  status: maintenanceStatusEnum,
  description: z.string().trim().optional().nullable(),
  reported_at: z.string().datetime().optional(),
  resolved_at: z.string().datetime().optional().nullable()
});

/**
 * Update maintenance request body validation
 * Used for PUT /maintenance-requests/:id endpoint
 * All fields optional for partial updates
 */
const updateMaintenanceRequestSchema = z.object({
  facility_id: uuidSchema.optional().nullable(),
  asset_id: uuidSchema.optional().nullable(),
  status: maintenanceStatusEnum.optional(),
  description: z.string().trim().optional().nullable(),
  resolved_at: z.string().datetime().optional().nullable()
});

/**
 * Triage maintenance request body validation
 * Used for POST /maintenance-requests/:id/triage endpoint
 */
const triageMaintenanceRequestSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS']).optional(),
  triage_summary: z.string().trim().max(10000).optional().nullable(),
  assigned_engineer: z.string().trim().max(120).optional().nullable(),
  sla_hours: z.number().int().positive().max(10000).optional().nullable()
});

// ==================== URL Params ====================

/**
 * Maintenance request ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const maintenanceRequestIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List maintenance requests query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with maintenance-request-specific filters
 */
const listMaintenanceRequestsQuerySchema = listQuerySchema.extend({
  facility_id: uuidSchema.optional(),
  asset_id: uuidSchema.optional(),
  status: maintenanceStatusEnum.optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createMaintenanceRequestSchema,
  updateMaintenanceRequestSchema,
  triageMaintenanceRequestSchema,
  maintenanceRequestIdParamsSchema,
  listMaintenanceRequestsQuerySchema,
  maintenanceStatusEnum
};
