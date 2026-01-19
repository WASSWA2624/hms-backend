/**
 * Subscription Invoice module validation schemas
 *
 * @module modules/subscription-invoice/schemas
 * @description Zod validation schemas for subscription invoice endpoints.
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
 * Create subscription invoice body validation
 * Used for POST /subscription-invoices endpoint
 */
const createSubscriptionInvoiceSchema = z.object({
  subscription_id: uuidSchema,
  invoice_id: uuidSchema
});

/**
 * Update subscription invoice body validation
 * Used for PUT /subscription-invoices/:id endpoint
 * All fields optional for partial updates
 */
const updateSubscriptionInvoiceSchema = z.object({
  subscription_id: uuidSchema.optional(),
  invoice_id: uuidSchema.optional()
});

// ==================== URL Params ====================

/**
 * Subscription Invoice ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const subscriptionInvoiceIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List subscription invoices query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with subscription invoice-specific filters
 */
const listSubscriptionInvoicesQuerySchema = listQuerySchema.extend({
  subscription_id: uuidSchema.optional(),
  invoice_id: uuidSchema.optional()
});

module.exports = {
  createSubscriptionInvoiceSchema,
  updateSubscriptionInvoiceSchema,
  subscriptionInvoiceIdParamsSchema,
  listSubscriptionInvoicesQuerySchema
};
