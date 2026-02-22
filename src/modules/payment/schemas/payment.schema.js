/**
 * Payment module validation schemas
 *
 * @module modules/payment/schemas
 * @description Zod validation schemas for payment endpoints.
 */

const { z } = require('zod');
const { uuidSchema, listQuerySchema, decimalStringSchema } = require('@lib/validation/zod');

const PAYMENT_STATUS_VALUES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];
const PAYMENT_METHOD_VALUES = [
  'CASH',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'PREPAID_CARD',
  'GIFT_CARD',
  'VOUCHER',
  'BANK_CHECK',
  'MOBILE_MONEY',
  'BANK_TRANSFER',
  'INSURANCE',
  'OTHER'
];

/**
 * Create payment body validation
 */
const createPaymentSchema = z.object({
  tenant_id: uuidSchema,
  facility_id: uuidSchema.optional().nullable(),
  patient_id: uuidSchema.optional().nullable(),
  invoice_id: uuidSchema,
  status: z.enum(PAYMENT_STATUS_VALUES),
  method: z.enum(PAYMENT_METHOD_VALUES),
  amount: decimalStringSchema,
  paid_at: z.string().datetime().optional().nullable(),
  transaction_ref: z.string().trim().max(120).optional().nullable()
});

/**
 * Update payment body validation
 */
const updatePaymentSchema = z.object({
  tenant_id: uuidSchema.optional(),
  facility_id: uuidSchema.optional().nullable(),
  patient_id: uuidSchema.optional().nullable(),
  invoice_id: uuidSchema.optional(),
  status: z.enum(PAYMENT_STATUS_VALUES).optional(),
  method: z.enum(PAYMENT_METHOD_VALUES).optional(),
  amount: decimalStringSchema.optional(),
  paid_at: z.string().datetime().optional().nullable(),
  transaction_ref: z.string().trim().max(120).optional().nullable()
});

const reconcilePaymentSchema = z.object({
  status: z.enum(['COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  notes: z.string().trim().max(10000).optional().nullable()
});

/**
 * Payment ID URL parameter validation
 */
const paymentIdParamsSchema = z.object({
  id: uuidSchema
});

/**
 * List payments query validation
 */
const listPaymentsQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  facility_id: uuidSchema.optional(),
  patient_id: uuidSchema.optional(),
  invoice_id: uuidSchema.optional(),
  status: z.enum(PAYMENT_STATUS_VALUES).optional(),
  method: z.enum(PAYMENT_METHOD_VALUES).optional(),
  paid_at_from: z.string().datetime().optional(),
  paid_at_to: z.string().datetime().optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createPaymentSchema,
  updatePaymentSchema,
  reconcilePaymentSchema,
  paymentIdParamsSchema,
  listPaymentsQuerySchema
};
