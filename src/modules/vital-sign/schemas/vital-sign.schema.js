/**
 * Vital Sign module validation schemas
 *
 * @module modules/vital-sign/schemas
 * @description Zod validation schemas for vital sign endpoints.
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
 * Create vital sign body validation
 * Used for POST /vital-signs endpoint
 */
const createVitalSignSchema = z.object({
  encounter_id: uuidSchema,
  vital_type: z.enum([
    'TEMPERATURE',
    'BLOOD_PRESSURE',
    'HEART_RATE',
    'RESPIRATORY_RATE',
    'OXYGEN_SATURATION',
    'WEIGHT',
    'HEIGHT',
    'BMI'
  ]),
  value: z.string().trim().min(1).max(80),
  unit: z.string().trim().max(20).optional().nullable(),
  recorded_at: z.string().datetime().optional()
});

/**
 * Update vital sign body validation
 * Used for PUT /vital-signs/:id endpoint
 * All fields optional for partial updates
 */
const updateVitalSignSchema = z.object({
  encounter_id: uuidSchema.optional(),
  vital_type: z.enum([
    'TEMPERATURE',
    'BLOOD_PRESSURE',
    'HEART_RATE',
    'RESPIRATORY_RATE',
    'OXYGEN_SATURATION',
    'WEIGHT',
    'HEIGHT',
    'BMI'
  ]).optional(),
  value: z.string().trim().min(1).max(80).optional(),
  unit: z.string().trim().max(20).optional().nullable(),
  recorded_at: z.string().datetime().optional()
});

// ==================== URL Params ====================

/**
 * Vital sign ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const vitalSignIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List vital signs query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with vital sign-specific filters
 */
const listVitalSignsQuerySchema = listQuerySchema.extend({
  encounter_id: uuidSchema.optional(),
  vital_type: z.enum([
    'TEMPERATURE',
    'BLOOD_PRESSURE',
    'HEART_RATE',
    'RESPIRATORY_RATE',
    'OXYGEN_SATURATION',
    'WEIGHT',
    'HEIGHT',
    'BMI'
  ]).optional()
});

module.exports = {
  createVitalSignSchema,
  updateVitalSignSchema,
  vitalSignIdParamsSchema,
  listVitalSignsQuerySchema
};
