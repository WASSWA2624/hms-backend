const express = require('express');
const router = express.Router();
const equipmentRegistryController = require('@controllers/equipment-registry/equipment-registry.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentRegistrySchema, updateEquipmentRegistrySchema, equipmentRegistryIdParamsSchema, listEquipmentRegistrysQuerySchema } = require('@validations/equipment-registry/equipment-registry.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentRegistrysQuerySchema }), equipmentRegistryController.listEquipmentRegistrys);
router.get('/:id', authenticate(), validateRequest({ params: equipmentRegistryIdParamsSchema }), equipmentRegistryController.getEquipmentRegistryById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentRegistrySchema }), equipmentRegistryController.createEquipmentRegistry);
router.put('/:id', authenticate(), validateRequest({ params: equipmentRegistryIdParamsSchema, body: updateEquipmentRegistrySchema }), equipmentRegistryController.updateEquipmentRegistry);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentRegistryIdParamsSchema }), equipmentRegistryController.deleteEquipmentRegistry);

module.exports = router;
