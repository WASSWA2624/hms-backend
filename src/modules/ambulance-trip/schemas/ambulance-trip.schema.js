/**
 * Ambulance Trip module validation schemas
 *
 * @module modules/ambulance-trip/schemas
 * @description Zod validation schemas for ambulance trip endpoints.
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
 * Create ambulance trip body validation
 * Used for POST /ambulance-trips endpoint
 */
const createAmbulanceTripSchema = z.object({
  ambulance_id: uuidSchema,
  emergency_case_id: uuidSchema,
  started_at: isoDateSchema.optional().nullable(),
  ended_at: isoDateSchema.optional().nullable()
});

/**
 * Update ambulance trip body validation
 * Used for PUT /ambulance-trips/:id endpoint
 * All fields optional for partial updates
 */
const updateAmbulanceTripSchema = z.object({
  ambulance_id: uuidSchema.optional(),
  emergency_case_id: uuidSchema.optional(),
  started_at: isoDateSchema.optional().nullable(),
  ended_at: isoDateSchema.optional().nullable()
});

// ==================== URL Params ====================

/**
 * Ambulance Trip ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const ambulanceTripIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List ambulance trips query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with ambulance trip-specific filters
 */
const listAmbulanceTripsQuerySchema = listQuerySchema.extend({
  ambulance_id: uuidSchema.optional(),
  emergency_case_id: uuidSchema.optional()
});

module.exports = {
  createAmbulanceTripSchema,
  updateAmbulanceTripSchema,
  ambulanceTripIdParamsSchema,
  listAmbulanceTripsQuerySchema
};
