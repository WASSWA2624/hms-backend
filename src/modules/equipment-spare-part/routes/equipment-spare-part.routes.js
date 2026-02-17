const express = require('express');
const router = express.Router();
const equipmentSparePartController = require('@controllers/equipment-spare-part/equipment-spare-part.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentSparePartSchema, updateEquipmentSparePartSchema, equipmentSparePartIdParamsSchema, listEquipmentSparePartsQuerySchema } = require('@validations/equipment-spare-part/equipment-spare-part.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentSparePartsQuerySchema }), equipmentSparePartController.listEquipmentSpareParts);
router.get('/:id', authenticate(), validateRequest({ params: equipmentSparePartIdParamsSchema }), equipmentSparePartController.getEquipmentSparePartById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentSparePartSchema }), equipmentSparePartController.createEquipmentSparePart);
router.put('/:id', authenticate(), validateRequest({ params: equipmentSparePartIdParamsSchema, body: updateEquipmentSparePartSchema }), equipmentSparePartController.updateEquipmentSparePart);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentSparePartIdParamsSchema }), equipmentSparePartController.deleteEquipmentSparePart);

module.exports = router;
