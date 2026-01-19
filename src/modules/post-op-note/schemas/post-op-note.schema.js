/**
 * Post-op note module validation schemas
 *
 * @module modules/post-op-note/schemas
 * @description Zod validation schemas for post-op note endpoints.
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
 * Create post-op note body validation
 * Used for POST /post-op-notes endpoint
 */
const createPostOpNoteSchema = z.object({
  theatre_case_id: uuidSchema,
  note: z.string().trim().min(1)
});

/**
 * Update post-op note body validation
 * Used for PUT /post-op-notes/:id endpoint
 * All fields optional for partial updates
 */
const updatePostOpNoteSchema = z.object({
  theatre_case_id: uuidSchema.optional(),
  note: z.string().trim().min(1).optional()
});

// ==================== URL Params ====================

/**
 * Post-op note ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const postOpNoteIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List post-op notes query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with post-op note-specific filters
 */
const listPostOpNotesQuerySchema = listQuerySchema.extend({
  theatre_case_id: uuidSchema.optional()
});

module.exports = {
  createPostOpNoteSchema,
  updatePostOpNoteSchema,
  postOpNoteIdParamsSchema,
  listPostOpNotesQuerySchema
};
