/**
 * Analytics event module validation schemas
 *
 * @module modules/analytics-event/schemas
 * @description Zod validation schemas for analytics event endpoints.
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
 * Create analytics event body validation
 * Used for POST /analytics-events endpoint
 */
const createAnalyticsEventSchema = z.object({
  tenant_id: uuidSchema,
  user_id: uuidSchema.optional().nullable(),
  event_name: z.string().trim().min(1).max(255),
  payload_json: z.record(z.string(), z.unknown()).optional().nullable(),
  occurred_at: isoDateSchema.optional()
});

/**
 * Update analytics event body validation
 * Used for PUT /analytics-events/:id endpoint
 * All fields optional for partial updates
 */
const updateAnalyticsEventSchema = z.object({
  event_name: z.string().trim().min(1).max(255).optional(),
  payload_json: z.record(z.string(), z.unknown()).nullable().optional(),
  occurred_at: isoDateSchema.optional()
});

// ==================== URL Params ====================

/**
 * Analytics event ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const analyticsEventIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List analytics events query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with analytics-event-specific filters
 */
const listAnalyticsEventsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  event_name: z.string().trim().optional(),
  search: z.string().trim().optional(),
  occurred_at_from: isoDateSchema.optional(),
  occurred_at_to: isoDateSchema.optional()
});

module.exports = {
  createAnalyticsEventSchema,
  updateAnalyticsEventSchema,
  analyticsEventIdParamsSchema,
  listAnalyticsEventsQuerySchema
};
