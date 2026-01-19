/**
 * Insurance claim module validation schemas
 *
 * @module modules/insurance-claim/schemas
 * @description Zod validation schemas for insurance claim endpoints.
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
 * Create insurance claim body validation
 * Used for POST /insurance-claims endpoint
 */
const createInsuranceClaimSchema = z.object({
  coverage_plan_id: uuidSchema,
  invoice_id: uuidSchema,
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED']).optional(),
  submitted_at: z.string().datetime().optional()
});

/**
 * Update insurance claim body validation
 * Used for PUT /insurance-claims/:id endpoint
 * All fields optional for partial updates
 */
const updateInsuranceClaimSchema = z.object({
  coverage_plan_id: uuidSchema.optional(),
  invoice_id: uuidSchema.optional(),
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED']).optional(),
  submitted_at: z.string().datetime().optional()
});

// ==================== URL Params ====================

/**
 * Insurance claim ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const insuranceClaimIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List insurance claims query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with insurance-claim-specific filters
 */
const listInsuranceClaimsQuerySchema = listQuerySchema.extend({
  coverage_plan_id: uuidSchema.optional(),
  invoice_id: uuidSchema.optional(),
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED']).optional(),
  submitted_at_from: z.string().datetime().optional(),
  submitted_at_to: z.string().datetime().optional()
});

module.exports = {
  createInsuranceClaimSchema,
  updateInsuranceClaimSchema,
  insuranceClaimIdParamsSchema,
  listInsuranceClaimsQuerySchema
};
