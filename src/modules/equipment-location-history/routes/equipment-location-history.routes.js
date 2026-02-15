const express = require('express');
const router = express.Router();
const equipmentLocationHistoryController = require('../controllers/equipment-location-history.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentLocationHistorySchema, updateEquipmentLocationHistorySchema, equipmentLocationHistoryIdParamsSchema, listEquipmentLocationHistorysQuerySchema } = require('../schemas/equipment-location-history.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentLocationHistorysQuerySchema }), equipmentLocationHistoryController.listEquipmentLocationHistorys);
router.get('/:id', authenticate(), validateRequest({ params: equipmentLocationHistoryIdParamsSchema }), equipmentLocationHistoryController.getEquipmentLocationHistoryById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentLocationHistorySchema }), equipmentLocationHistoryController.createEquipmentLocationHistory);
router.put('/:id', authenticate(), validateRequest({ params: equipmentLocationHistoryIdParamsSchema, body: updateEquipmentLocationHistorySchema }), equipmentLocationHistoryController.updateEquipmentLocationHistory);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentLocationHistoryIdParamsSchema }), equipmentLocationHistoryController.deleteEquipmentLocationHistory);

module.exports = router;
