/**
 * Referral module validation schemas
 *
 * @module modules/referral/schemas
 * @description Zod validation schemas for referral endpoints.
 * Per validation.mdc: Use Zod exclusively for all validation
 * Per module-creation.mdc: Define schemas for body, params, and query
 */

const { z } = require('zod');
const { 
  uuidSchema, 
  listQuerySchema
} = require('@lib/validation/zod');

const REFERRAL_STATUS_VALUES = ['REQUESTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

// ==================== Body Schemas ====================

/**
 * Create referral body validation
 * Used for POST /referrals endpoint
 */
const createReferralSchema = z.object({
  encounter_id: uuidSchema,
  from_department_id: uuidSchema.optional().nullable(),
  to_department_id: uuidSchema.optional().nullable(),
  reason: z.string().max(10000).optional().nullable(),
  status: z.enum(REFERRAL_STATUS_VALUES).optional().default('REQUESTED')
});

/**
 * Update referral body validation
 * Used for PUT /referrals/:id endpoint
 * All fields optional for partial updates
 */
const updateReferralSchema = z.object({
  from_department_id: uuidSchema.optional().nullable(),
  to_department_id: uuidSchema.optional().nullable(),
  reason: z.string().max(10000).optional().nullable(),
  status: z.enum(REFERRAL_STATUS_VALUES).optional()
});

/**
 * Redeem referral body validation
 * Used for POST /referrals/:id/redeem endpoint
 */
const redeemReferralSchema = z.object({
  notes: z.string().trim().max(10000).optional().nullable()
});

/**
 * Referral transition action body validation
 * Used for POST /referrals/:id/approve|start|cancel endpoints
 */
const transitionReferralSchema = z.object({
  notes: z.string().trim().max(10000).optional().nullable()
});

// ==================== URL Params ====================

/**
 * Referral ID URL parameter validation
 * Used for GET /:id, PUT /:id, and DELETE /:id endpoints
 */
const referralIdParamsSchema = z.object({
  id: uuidSchema
});

// ==================== Query Params ====================

/**
 * List referrals query parameter validation
 * Used for GET / endpoint
 * Extends base listQuerySchema with referral-specific filters
 */
const listReferralsQuerySchema = listQuerySchema.extend({
  encounter_id: uuidSchema.optional(),
  from_department_id: uuidSchema.optional(),
  to_department_id: uuidSchema.optional(),
  status: z.enum(REFERRAL_STATUS_VALUES).optional()
});

module.exports = {
  createReferralSchema,
  updateReferralSchema,
  redeemReferralSchema,
  transitionReferralSchema,
  referralIdParamsSchema,
  listReferralsQuerySchema,
  REFERRAL_STATUS_VALUES
};
