/**
 * Subscription Plan module validation schemas
 *
 * @module modules/subscription-plan/schemas
 * @description Zod validation schemas for subscription plan endpoints.
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
 * Create subscription plan body validation
 * Used for POST /subscription-plans endpoint
 */
const createSubscriptionPlanSchema = z.object({
  tenant_id: uuidSchema.optional().nullable(),
  name: z.string().trim().min(1).max(255),
  price: z.number().min(0).finite(),
  billing_cycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY'])
});

/**
 * Update subscription plan body validation
 * Used for PUT /subscription-plans/:id endpoint
 * All fields optional for partial updates
 */
const updateSubscriptionPlanSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  price: z.number().min(0).finite().optional(),
  billing_cycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional()
});

// ==================== URL Params ====================

/**
 * Subscription Plan ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const subscriptionPlanIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List subscription plans query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with subscription plan-specific filters
 */
const listSubscriptionPlansQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  name: z.string().trim().optional(),
  billing_cycle: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
  subscriptionPlanIdParamsSchema,
  listSubscriptionPlansQuerySchema
};
