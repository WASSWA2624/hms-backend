const express = require('express');
const router = express.Router();
const equipmentWorkOrderController = require('@controllers/equipment-work-order/equipment-work-order.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentWorkOrderSchema, updateEquipmentWorkOrderSchema, equipmentWorkOrderIdParamsSchema, listEquipmentWorkOrdersQuerySchema } = require('@validations/equipment-work-order/equipment-work-order.schema');

router.get('/', validateRequest({ query: listEquipmentWorkOrdersQuerySchema }), authenticate(), equipmentWorkOrderController.listEquipmentWorkOrders);
router.get('/:id', validateRequest({ params: equipmentWorkOrderIdParamsSchema }), authenticate(), equipmentWorkOrderController.getEquipmentWorkOrderById);
router.post('/', validateRequest({ body: createEquipmentWorkOrderSchema }), authenticate(), equipmentWorkOrderController.createEquipmentWorkOrder);
router.put('/:id', validateRequest({ params: equipmentWorkOrderIdParamsSchema, body: updateEquipmentWorkOrderSchema }), authenticate(), equipmentWorkOrderController.updateEquipmentWorkOrder);
router.delete('/:id', validateRequest({ params: equipmentWorkOrderIdParamsSchema }), authenticate(), equipmentWorkOrderController.deleteEquipmentWorkOrder);

module.exports = router;

