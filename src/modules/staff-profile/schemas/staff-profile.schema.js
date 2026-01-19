/**
 * Staff profile module validation schemas
 *
 * @module modules/staff-profile/schemas
 * @description Zod validation schemas for staff profile endpoints.
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
 * Create staff profile body validation
 * Used for POST /staff-profiles endpoint
 */
const createStaffProfileSchema = z.object({
  tenant_id: uuidSchema,
  user_id: uuidSchema,
  department_id: uuidSchema.optional().nullable(),
  staff_number: z.string().trim().max(80).optional().nullable(),
  position: z.string().trim().max(120).optional().nullable(),
  hire_date: z.coerce.date().optional().nullable()
});

/**
 * Update staff profile body validation
 * Used for PUT /staff-profiles/:id endpoint
 * All fields optional for partial updates
 */
const updateStaffProfileSchema = z.object({
  department_id: uuidSchema.optional().nullable(),
  staff_number: z.string().trim().max(80).optional().nullable(),
  position: z.string().trim().max(120).optional().nullable(),
  hire_date: z.coerce.date().optional().nullable()
});

// ==================== URL Params ====================

/**
 * Staff profile ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const staffProfileIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List staff profiles query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with staff-profile-specific filters
 */
const listStaffProfilesQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  department_id: uuidSchema.optional(),
  staff_number: z.string().trim().optional(),
  position: z.string().trim().optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createStaffProfileSchema,
  updateStaffProfileSchema,
  staffProfileIdParamsSchema,
  listStaffProfilesQuerySchema
};
