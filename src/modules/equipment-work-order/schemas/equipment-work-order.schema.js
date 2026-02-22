const { z } = require('zod');
const { uuidSchema, listQuerySchema } = require('@lib/validation/zod');

const createEquipmentWorkOrderSchema = z.object({
  tenant_id: uuidSchema
}).passthrough();

const updateEquipmentWorkOrderSchema = z.object({}).passthrough();

const startEquipmentWorkOrderSchema = z.object({
  notes: z.string().trim().max(10000).optional().nullable(),
  started_at: z.string().datetime().optional().nullable()
});

const returnToServiceEquipmentWorkOrderSchema = z.object({
  verification_evidence: z.string().trim().min(1).max(10000),
  notes: z.string().trim().max(10000).optional().nullable()
});

const equipmentWorkOrderIdParamsSchema = z.object({
  id: uuidSchema
});

const listEquipmentWorkOrdersQuerySchema = listQuerySchema.extend({
  tenant_id: uuidSchema.optional(),
  search: z.string().trim().optional()
}).passthrough();

module.exports = {
  createEquipmentWorkOrderSchema,
  updateEquipmentWorkOrderSchema,
  startEquipmentWorkOrderSchema,
  returnToServiceEquipmentWorkOrderSchema,
  equipmentWorkOrderIdParamsSchema,
  listEquipmentWorkOrdersQuerySchema
};
