const express = require('express');
const router = express.Router();
const equipmentDowntimeLogController = require('@controllers/equipment-downtime-log/equipment-downtime-log.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentDowntimeLogSchema, updateEquipmentDowntimeLogSchema, equipmentDowntimeLogIdParamsSchema, listEquipmentDowntimeLogsQuerySchema } = require('@validations/equipment-downtime-log/equipment-downtime-log.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentDowntimeLogsQuerySchema }), equipmentDowntimeLogController.listEquipmentDowntimeLogs);
router.get('/:id', authenticate(), validateRequest({ params: equipmentDowntimeLogIdParamsSchema }), equipmentDowntimeLogController.getEquipmentDowntimeLogById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentDowntimeLogSchema }), equipmentDowntimeLogController.createEquipmentDowntimeLog);
router.put('/:id', authenticate(), validateRequest({ params: equipmentDowntimeLogIdParamsSchema, body: updateEquipmentDowntimeLogSchema }), equipmentDowntimeLogController.updateEquipmentDowntimeLog);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentDowntimeLogIdParamsSchema }), equipmentDowntimeLogController.deleteEquipmentDowntimeLog);

module.exports = router;
