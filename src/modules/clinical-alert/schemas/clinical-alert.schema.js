/**
 * Clinical Alert module validation schemas
 *
 * @module modules/clinical-alert/schemas
 * @description Zod validation schemas for clinical alert endpoints.
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
 * Create clinical alert body validation
 * Used for POST /clinical-alerts endpoint
 */
const createClinicalAlertSchema = z.object({
  encounter_id: uuidSchema,
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  message: z.string().trim().min(1)
});

/**
 * Update clinical alert body validation
 * Used for PUT /clinical-alerts/:id endpoint
 * All fields optional for partial updates
 */
const updateClinicalAlertSchema = z.object({
  encounter_id: uuidSchema.optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  message: z.string().trim().min(1).optional()
});

// ==================== URL Params ====================

/**
 * Clinical alert ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const clinicalAlertIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List clinical alerts query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with clinical alert-specific filters
 */
const listClinicalAlertsQuerySchema = listQuerySchema.extend({
  encounter_id: uuidSchema.optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
});

module.exports = {
  createClinicalAlertSchema,
  updateClinicalAlertSchema,
  clinicalAlertIdParamsSchema,
  listClinicalAlertsQuerySchema
};
