const express = require('express');
const router = express.Router();
const equipmentServiceProviderController = require('@controllers/equipment-service-provider/equipment-service-provider.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentServiceProviderSchema, updateEquipmentServiceProviderSchema, equipmentServiceProviderIdParamsSchema, listEquipmentServiceProvidersQuerySchema } = require('@validations/equipment-service-provider/equipment-service-provider.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentServiceProvidersQuerySchema }), equipmentServiceProviderController.listEquipmentServiceProviders);
router.get('/:id', authenticate(), validateRequest({ params: equipmentServiceProviderIdParamsSchema }), equipmentServiceProviderController.getEquipmentServiceProviderById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentServiceProviderSchema }), equipmentServiceProviderController.createEquipmentServiceProvider);
router.put('/:id', authenticate(), validateRequest({ params: equipmentServiceProviderIdParamsSchema, body: updateEquipmentServiceProviderSchema }), equipmentServiceProviderController.updateEquipmentServiceProvider);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentServiceProviderIdParamsSchema }), equipmentServiceProviderController.deleteEquipmentServiceProvider);

module.exports = router;
