/**
 * Webhook subscription module validation schemas
 *
 * @module modules/webhook-subscription/schemas
 * @description Zod validation schemas for webhook subscription endpoints.
 * Per validation.mdc: Use Zod exclusively for all validation
 * Per module-creation.mdc: Define schemas for body, params, and query
 */

const { z } = require('zod');
const { 
  uuidSchema, 
  urlSchema,
  listQuerySchema
} = require('@lib/validation/zod');

// ==================== Body Schemas ====================

/**
 * Create webhook subscription body validation
 * Used for POST /webhook-subscriptions endpoint
 */
const createWebhookSubscriptionSchema = z.object({
  tenant_id: uuidSchema,
  integration_id: uuidSchema.optional().nullable(),
  event: z.string().trim().min(1).max(120),
  target_url: urlSchema.max(255),
  is_active: z.boolean().optional().default(true)
});

/**
 * Update webhook subscription body validation
 * Used for PUT /webhook-subscriptions/:id endpoint
 * All fields optional for partial updates
 */
const updateWebhookSubscriptionSchema = z.object({
  integration_id: uuidSchema.optional().nullable(),
  event: z.string().trim().min(1).max(120).optional(),
  target_url: urlSchema.max(255).optional(),
  is_active: z.boolean().optional()
});

const replayWebhookSubscriptionSchema = z.object({
  payload_json: z.any().optional().nullable(),
  notes: z.string().trim().max(10000).optional().nullable()
});

// ==================== URL Params ====================

/**
 * Webhook subscription ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const webhookSubscriptionIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List webhook subscriptions query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with webhook-subscription-specific filters
 */
const listWebhookSubscriptionsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  integration_id: uuidSchema.optional(),
  event: z.string().trim().optional(),
  is_active: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
  search: z.string().trim().optional()
});

module.exports = {
  createWebhookSubscriptionSchema,
  updateWebhookSubscriptionSchema,
  replayWebhookSubscriptionSchema,
  webhookSubscriptionIdParamsSchema,
  listWebhookSubscriptionsQuerySchema
};
