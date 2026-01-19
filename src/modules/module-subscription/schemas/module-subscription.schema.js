/**
 * Module subscription module validation schemas
 *
 * @module modules/module-subscription/schemas
 * @description Zod validation schemas for module subscription endpoints.
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
 * Create module subscription body validation
 * Used for POST /module-subscriptions endpoint
 */
const createModuleSubscriptionSchema = z.object({
  module_id: uuidSchema,
  subscription_id: uuidSchema,
  is_active: z.boolean().optional()
});

/**
 * Update module subscription body validation
 * Used for PUT /module-subscriptions/:id endpoint
 * All fields optional for partial updates
 */
const updateModuleSubscriptionSchema = z.object({
  module_id: uuidSchema.optional(),
  subscription_id: uuidSchema.optional(),
  is_active: z.boolean().optional()
});

// ==================== URL Params ====================

/**
 * Module subscription ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const moduleSubscriptionIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List module subscriptions query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with module subscription-specific filters
 */
const listModuleSubscriptionsQuerySchema = listQuerySchema.extend({
  module_id: uuidSchema.optional(),
  subscription_id: uuidSchema.optional(),
  is_active: z.enum(['true', 'false']).optional()
});

module.exports = {
  createModuleSubscriptionSchema,
  updateModuleSubscriptionSchema,
  moduleSubscriptionIdParamsSchema,
  listModuleSubscriptionsQuerySchema
};
