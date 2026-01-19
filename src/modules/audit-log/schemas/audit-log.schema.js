/**
 * Audit log module validation schemas
 *
 * @module modules/audit-log/schemas
 * @description Zod validation schemas for audit log endpoints.
 * Per validation.mdc: Use Zod exclusively for all validation
 * Per module-creation.mdc: Define schemas for body, params, and query
 * Note: This is a READ-ONLY module - no create/update schemas
 */

const { z } = require('zod');
const { 
  uuidSchema, 
  listQuerySchema
} = require('@lib/validation/zod');

// ==================== URL Params ====================

/**
 * Audit log ID URL parameter validation
 * Used for GET /:id endpoint
 */
const auditLogIdParamsSchema = z.object({
  id: uuidSchema
});

/**
 * User ID URL parameter validation
 * Used for GET /user/:userId endpoint
 */
const userIdParamsSchema = z.object({
  userId: uuidSchema
});

/**
 * Entity URL parameter validation
 * Used for GET /entity/:entity/:entityId endpoint
 */
const entityParamsSchema = z.object({
  entity: z.string().trim().min(1).max(120),
  entityId: uuidSchema
});

// ==================== Query Params ====================

/**
 * List audit logs query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with audit-log-specific filters
 */
const listAuditLogsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'ACCESS', 'EXPORT', 'LOGIN', 'LOGOUT']).optional(),
  entity: z.string().trim().max(120).optional(),
  entity_id: uuidSchema.optional(),
  ip_address: z.string().trim().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional()
});

module.exports = {
  auditLogIdParamsSchema,
  userIdParamsSchema,
  entityParamsSchema,
  listAuditLogsQuerySchema
};
