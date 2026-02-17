const express = require('express');
const router = express.Router();
const equipmentWorkOrderController = require('@controllers/equipment-work-order/equipment-work-order.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentWorkOrderSchema, updateEquipmentWorkOrderSchema, equipmentWorkOrderIdParamsSchema, listEquipmentWorkOrdersQuerySchema } = require('@validations/equipment-work-order/equipment-work-order.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentWorkOrdersQuerySchema }), equipmentWorkOrderController.listEquipmentWorkOrders);
router.get('/:id', authenticate(), validateRequest({ params: equipmentWorkOrderIdParamsSchema }), equipmentWorkOrderController.getEquipmentWorkOrderById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentWorkOrderSchema }), equipmentWorkOrderController.createEquipmentWorkOrder);
router.put('/:id', authenticate(), validateRequest({ params: equipmentWorkOrderIdParamsSchema, body: updateEquipmentWorkOrderSchema }), equipmentWorkOrderController.updateEquipmentWorkOrder);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentWorkOrderIdParamsSchema }), equipmentWorkOrderController.deleteEquipmentWorkOrder);

module.exports = router;
