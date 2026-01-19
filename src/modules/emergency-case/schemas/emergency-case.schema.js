/**
 * Emergency case module validation schemas
 *
 * @module modules/emergency-case/schemas
 * @description Zod validation schemas for emergency case endpoints.
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
 * Create emergency case body validation
 * Used for POST /emergency-cases endpoint
 */
const createEmergencyCaseSchema = z.object({
  tenant_id: uuidSchema,
  facility_id: uuidSchema.optional().nullable(),
  patient_id: uuidSchema,
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
});

/**
 * Update emergency case body validation
 * Used for PUT /emergency-cases/:id endpoint
 * All fields optional for partial updates
 */
const updateEmergencyCaseSchema = z.object({
  facility_id: uuidSchema.optional().nullable(),
  patient_id: uuidSchema.optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional()
});

// ==================== URL Params ====================

/**
 * Emergency case ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const emergencyCaseIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List emergency cases query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with emergency case-specific filters
 */
const listEmergencyCasesQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  facility_id: uuidSchema.optional(),
  patient_id: uuidSchema.optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional()
});

module.exports = {
  createEmergencyCaseSchema,
  updateEmergencyCaseSchema,
  emergencyCaseIdParamsSchema,
  listEmergencyCasesQuerySchema
};
