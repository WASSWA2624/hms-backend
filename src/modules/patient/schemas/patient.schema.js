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

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const APPOINTMENT_STATUS_VALUES = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
];

const normalizeOptionalTextQuery = (maxLength = 120) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value ? value : undefined));

const isValidDateQueryInput = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return false;
  if (DATE_ONLY_REGEX.test(normalized)) return true;
  return !Number.isNaN(Date.parse(normalized));
};

const dateQuerySchema = z
  .string()
  .trim()
  .max(40)
  .refine(isValidDateQueryInput, 'Invalid date filter value')
  .optional()
  .transform((value) => (value ? value : undefined));

const searchQuerySchema = z
  .string()
  .trim()
  .max(120)
  .transform((value) => value.replace(/\s+/g, ' ').trim())
  .optional()
  .transform((value) => (value ? value : undefined));

const patientFriendlyIdSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^(?=.*\d)[A-Za-z][A-Za-z0-9_-]*$/, 'Invalid patient identifier format')
  .transform((value) => value.toUpperCase());

const patientRouteIdSchema = z.union([uuidSchema, patientFriendlyIdSchema]);

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
  id: patientRouteIdSchema
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
  patient_id: normalizeOptionalTextQuery(64),
  first_name: normalizeOptionalTextQuery(120),
  last_name: normalizeOptionalTextQuery(120),
  date_of_birth: dateQuerySchema,
  date_of_birth_from: dateQuerySchema,
  date_of_birth_to: dateQuerySchema,
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional(),
  contact: normalizeOptionalTextQuery(255),
  appointment_status: z.enum(APPOINTMENT_STATUS_VALUES).optional(),
  created_at: dateQuerySchema,
  created_from: dateQuerySchema,
  created_to: dateQuerySchema,
  appointment_from: dateQuerySchema,
  appointment_to: dateQuerySchema,
  is_active: z.string().transform(val => val === 'true').optional(),
  search: searchQuerySchema
});

module.exports = {
  createPatientSchema,
  updatePatientSchema,
  patientIdParamsSchema,
  listPatientsQuerySchema
};
