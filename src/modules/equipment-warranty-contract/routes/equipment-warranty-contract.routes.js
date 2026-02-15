const express = require('express');
const router = express.Router();
const equipmentWarrantyContractController = require('../controllers/equipment-warranty-contract.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentWarrantyContractSchema, updateEquipmentWarrantyContractSchema, equipmentWarrantyContractIdParamsSchema, listEquipmentWarrantyContractsQuerySchema } = require('../schemas/equipment-warranty-contract.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentWarrantyContractsQuerySchema }), equipmentWarrantyContractController.listEquipmentWarrantyContracts);
router.get('/:id', authenticate(), validateRequest({ params: equipmentWarrantyContractIdParamsSchema }), equipmentWarrantyContractController.getEquipmentWarrantyContractById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentWarrantyContractSchema }), equipmentWarrantyContractController.createEquipmentWarrantyContract);
router.put('/:id', authenticate(), validateRequest({ params: equipmentWarrantyContractIdParamsSchema, body: updateEquipmentWarrantyContractSchema }), equipmentWarrantyContractController.updateEquipmentWarrantyContract);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentWarrantyContractIdParamsSchema }), equipmentWarrantyContractController.deleteEquipmentWarrantyContract);

module.exports = router;
