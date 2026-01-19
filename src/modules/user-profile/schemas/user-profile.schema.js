/**
 * User profile module validation schemas
 *
 * @module modules/user-profile/schemas
 * @description Zod validation schemas for user profile endpoints.
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
 * Create user profile body validation
 * Used for POST /user-profiles endpoint
 */
const createUserProfileSchema = z.object({
  user_id: uuidSchema,
  facility_id: uuidSchema.optional().nullable(),
  first_name: z.string().trim().min(1).max(120),
  last_name: z.string().trim().min(1).max(120),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional().nullable(),
  date_of_birth: z.string().datetime().optional().nullable()
});

/**
 * Update user profile body validation
 * Used for PUT /user-profiles/:id endpoint
 * All fields optional for partial updates
 */
const updateUserProfileSchema = z.object({
  facility_id: uuidSchema.optional().nullable(),
  first_name: z.string().trim().min(1).max(120).optional(),
  last_name: z.string().trim().min(1).max(120).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional().nullable(),
  date_of_birth: z.string().datetime().optional().nullable()
});

// ==================== URL Params ====================

/**
 * User profile ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const userProfileIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List user profiles query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with user profile-specific filters
 */
const listUserProfilesQuerySchema = listQuerySchema.extend({
  user_id: uuidSchema.optional(),
  facility_id: uuidSchema.optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createUserProfileSchema,
  updateUserProfileSchema,
  userProfileIdParamsSchema,
  listUserProfilesQuerySchema
};
