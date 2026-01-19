/**
 * Ambulance Dispatch module validation schemas
 *
 * @module modules/ambulance-dispatch/schemas
 * @description Zod validation schemas for ambulance dispatch endpoints.
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
 * Create ambulance dispatch body validation
 * Used for POST /ambulance-dispatches endpoint
 */
const createAmbulanceDispatchSchema = z.object({
  ambulance_id: uuidSchema,
  emergency_case_id: uuidSchema,
  dispatched_at: isoDateSchema.optional(),
  status: z.enum(['AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'TRANSPORTING', 'OUT_OF_SERVICE'])
});

/**
 * Update ambulance dispatch body validation
 * Used for PUT /ambulance-dispatches/:id endpoint
 * All fields optional for partial updates
 */
const updateAmbulanceDispatchSchema = z.object({
  ambulance_id: uuidSchema.optional(),
  emergency_case_id: uuidSchema.optional(),
  dispatched_at: isoDateSchema.optional(),
  status: z.enum(['AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'TRANSPORTING', 'OUT_OF_SERVICE']).optional()
});

// ==================== URL Params ====================

/**
 * Ambulance Dispatch ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const ambulanceDispatchIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List ambulance dispatches query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with ambulance dispatch-specific filters
 */
const listAmbulanceDispatchesQuerySchema = listQuerySchema.extend({
  ambulance_id: uuidSchema.optional(),
  emergency_case_id: uuidSchema.optional(),
  status: z.enum(['AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'TRANSPORTING', 'OUT_OF_SERVICE']).optional()
});

module.exports = {
  createAmbulanceDispatchSchema,
  updateAmbulanceDispatchSchema,
  ambulanceDispatchIdParamsSchema,
  listAmbulanceDispatchesQuerySchema
};
