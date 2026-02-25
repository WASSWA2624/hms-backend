/**
 * Provider schedule module validation schemas
 *
 * @module modules/provider-schedule/schemas
 * @description Zod validation schemas for provider schedule endpoints.
 * Per validation.mdc: Use Zod exclusively for all validation
 * Per module-creation.mdc: Define schemas for body, params, and query
 */

const { z } = require('zod');
const { 
  uuidSchema, 
  listQuerySchema
} = require('@lib/validation/zod');

const PROVIDER_FRIENDLY_ID_REGEX = /^(?=.*\d)[A-Za-z][A-Za-z0-9_-]*$/;

const providerIdentifierSchema = z.union([
  uuidSchema,
  z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(PROVIDER_FRIENDLY_ID_REGEX, 'Invalid provider identifier format')
    .transform((value) => value.toUpperCase())
]);

// ==================== Body Schemas ====================

/**
 * Create provider schedule body validation
 * Used for POST /provider-schedules endpoint
 */
const createProviderScheduleSchema = z.object({
  tenant_id: uuidSchema,
  facility_id: uuidSchema.optional().nullable(),
  provider_user_id: providerIdentifierSchema,
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().trim().datetime(),
  end_time: z.string().trim().datetime()
});

/**
 * Update provider schedule body validation
 * Used for PUT /provider-schedules/:id endpoint
 * All fields optional for partial updates
 */
const updateProviderScheduleSchema = z.object({
  facility_id: uuidSchema.optional().nullable(),
  provider_user_id: providerIdentifierSchema.optional(),
  day_of_week: z.number().int().min(0).max(6).optional(),
  start_time: z.string().trim().datetime().optional(),
  end_time: z.string().trim().datetime().optional()
});

// ==================== URL Params ====================

/**
 * Provider schedule ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const providerScheduleIdParamsSchema = z.object({
  id: providerIdentifierSchema
});

// ==================== Query Params ====================

/**
 * List provider schedules query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with provider schedule-specific filters
 */
const listProviderSchedulesQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  facility_id: uuidSchema.optional(),
  provider_user_id: providerIdentifierSchema.optional(),
  day_of_week: z.coerce.number().int().min(0).max(6).optional()
});

module.exports = {
  createProviderScheduleSchema,
  updateProviderScheduleSchema,
  providerScheduleIdParamsSchema,
  listProviderSchedulesQuerySchema
};
