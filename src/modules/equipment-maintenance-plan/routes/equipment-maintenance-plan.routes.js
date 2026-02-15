const express = require('express');
const router = express.Router();
const equipmentMaintenancePlanController = require('../controllers/equipment-maintenance-plan.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentMaintenancePlanSchema, updateEquipmentMaintenancePlanSchema, equipmentMaintenancePlanIdParamsSchema, listEquipmentMaintenancePlansQuerySchema } = require('../schemas/equipment-maintenance-plan.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentMaintenancePlansQuerySchema }), equipmentMaintenancePlanController.listEquipmentMaintenancePlans);
router.get('/:id', authenticate(), validateRequest({ params: equipmentMaintenancePlanIdParamsSchema }), equipmentMaintenancePlanController.getEquipmentMaintenancePlanById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentMaintenancePlanSchema }), equipmentMaintenancePlanController.createEquipmentMaintenancePlan);
router.put('/:id', authenticate(), validateRequest({ params: equipmentMaintenancePlanIdParamsSchema, body: updateEquipmentMaintenancePlanSchema }), equipmentMaintenancePlanController.updateEquipmentMaintenancePlan);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentMaintenancePlanIdParamsSchema }), equipmentMaintenancePlanController.deleteEquipmentMaintenancePlan);

module.exports = router;
