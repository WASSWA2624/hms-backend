/**
 * Anesthesia record module validation schemas
 *
 * @module modules/anesthesia-record/schemas
 * @description Zod validation schemas for anesthesia record endpoints.
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
 * Create anesthesia record body validation
 * Used for POST /anesthesia-records endpoint
 */
const createAnesthesiaRecordSchema = z.object({
  theatre_case_id: uuidSchema,
  anesthetist_user_id: uuidSchema.optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

/**
 * Update anesthesia record body validation
 * Used for PUT /anesthesia-records/:id endpoint
 * All fields optional for partial updates
 */
const updateAnesthesiaRecordSchema = z.object({
  theatre_case_id: uuidSchema.optional(),
  anesthetist_user_id: uuidSchema.optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

// ==================== URL Params ====================

/**
 * Anesthesia record ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const anesthesiaRecordIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List anesthesia records query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with anesthesia record-specific filters
 */
const listAnesthesiaRecordsQuerySchema = listQuerySchema.extend({
  theatre_case_id: uuidSchema.optional(),
  anesthetist_user_id: uuidSchema.optional()
});

module.exports = {
  createAnesthesiaRecordSchema,
  updateAnesthesiaRecordSchema,
  anesthesiaRecordIdParamsSchema,
  listAnesthesiaRecordsQuerySchema
};
