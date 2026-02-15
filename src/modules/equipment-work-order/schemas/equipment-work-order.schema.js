const { z } = require('zod');
const { uuidSchema, listQuerySchema } = require('@lib/validation/zod');

const createEquipmentWorkOrderSchema = z.object({
  tenant_id: uuidSchema
}).passthrough();

const updateEquipmentWorkOrderSchema = z.object({}).passthrough();

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
  equipmentWorkOrderIdParamsSchema,
  listEquipmentWorkOrdersQuerySchema
};
