/**
 * Pharmacy order item module validation schemas
 *
 * @module modules/pharmacy-order-item/schemas
 * @description Zod validation schemas for pharmacy order item endpoints.
 */

const { z } = require('zod');
const { uuidSchema, listQuerySchema } = require('@lib/validation/zod');

const PRESCRIPTION_STATUS_VALUES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
const MEDICATION_ROUTE_VALUES = ['ORAL', 'IV', 'IM', 'TOPICAL', 'INHALATION', 'OTHER'];
const MEDICATION_FREQUENCY_VALUES = ['ONCE', 'BID', 'TID', 'QID', 'PRN', 'STAT', 'CUSTOM'];

/**
 * Create pharmacy order item body validation
 */
const createPharmacyOrderItemSchema = z.object({
  pharmacy_order_id: uuidSchema,
  drug_id: uuidSchema,
  quantity: z.coerce.number().int().positive(),
  dosage: z.string().trim().max(80).optional().nullable(),
  frequency: z.enum(MEDICATION_FREQUENCY_VALUES).optional().nullable(),
  route: z.enum(MEDICATION_ROUTE_VALUES).optional().nullable(),
  status: z.enum(PRESCRIPTION_STATUS_VALUES).optional()
});

/**
 * Update pharmacy order item body validation
 */
const updatePharmacyOrderItemSchema = z.object({
  pharmacy_order_id: uuidSchema.optional(),
  drug_id: uuidSchema.optional(),
  quantity: z.coerce.number().int().positive().optional(),
  dosage: z.string().trim().max(80).optional().nullable(),
  frequency: z.enum(MEDICATION_FREQUENCY_VALUES).optional().nullable(),
  route: z.enum(MEDICATION_ROUTE_VALUES).optional().nullable(),
  status: z.enum(PRESCRIPTION_STATUS_VALUES).optional()
});

/**
 * Pharmacy order item ID URL parameter validation
 */
const pharmacyOrderItemIdParamsSchema = z.object({
  id: uuidSchema
});

/**
 * List pharmacy order items query validation
 */
const listPharmacyOrderItemsQuerySchema = listQuerySchema.extend({
  pharmacy_order_id: uuidSchema.optional(),
  drug_id: uuidSchema.optional(),
  status: z.enum(PRESCRIPTION_STATUS_VALUES).optional(),
  route: z.enum(MEDICATION_ROUTE_VALUES).optional(),
  frequency: z.enum(MEDICATION_FREQUENCY_VALUES).optional(),
  search: z.string().trim().optional()
});

module.exports = {
  createPharmacyOrderItemSchema,
  updatePharmacyOrderItemSchema,
  pharmacyOrderItemIdParamsSchema,
  listPharmacyOrderItemsQuerySchema
};

