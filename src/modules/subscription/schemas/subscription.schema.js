/**
 * Subscription module validation schemas
 *
 * @module modules/subscription/schemas
 * @description Zod validation schemas for subscription endpoints.
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
 * Create subscription body validation
 * Used for POST /subscriptions endpoint
 */
const createSubscriptionSchema = z.object({
  tenant_id: uuidSchema,
  plan_id: uuidSchema,
  status: z.enum(['ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIAL']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional().nullable()
});

/**
 * Update subscription body validation
 * Used for PUT /subscriptions/:id endpoint
 * All fields optional for partial updates
 */
const updateSubscriptionSchema = z.object({
  plan_id: uuidSchema.optional(),
  status: z.enum(['ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIAL']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional().nullable()
});

// ==================== URL Params ====================

/**
 * Subscription ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const subscriptionIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List subscriptions query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with subscription-specific filters
 */
const listSubscriptionsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  plan_id: uuidSchema.optional(),
  status: z.enum(['ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIAL']).optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  subscriptionIdParamsSchema,
  listSubscriptionsQuerySchema
};
