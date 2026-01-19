/**
 * Patient module validation schemas
 *
 * @module modules/patient/schemas
 * @description Zod validation schemas for patient endpoints.
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
 * Create patient body validation
 * Used for POST /patients endpoint
 */
const createPatientSchema = z.object({
  tenant_id: uuidSchema,
  facility_id: uuidSchema.optional().nullable(),
  first_name: z.string().trim().min(1).max(120),
  last_name: z.string().trim().min(1).max(120),
  date_of_birth: z.string().datetime().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional().nullable(),
  is_active: z.boolean().optional()
});

/**
 * Update patient body validation
 * Used for PUT /patients/:id endpoint
 * All fields optional for partial updates
 */
const updatePatientSchema = z.object({
  facility_id: uuidSchema.optional().nullable(),
  first_name: z.string().trim().min(1).max(120).optional(),
  last_name: z.string().trim().min(1).max(120).optional(),
  date_of_birth: z.string().datetime().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional().nullable(),
  is_active: z.boolean().optional()
});

// ==================== URL Params ====================

/**
 * Patient ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const patientIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List patients query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with patient-specific filters
 */
const listPatientsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  facility_id: uuidSchema.optional(),
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional(),
  is_active: z.string().transform(val => val === 'true').optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createPatientSchema,
  updatePatientSchema,
  patientIdParamsSchema,
  listPatientsQuerySchema
};
