const express = require('express');
const router = express.Router();
const equipmentSafetyTestLogController = require('../controllers/equipment-safety-test-log.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentSafetyTestLogSchema, updateEquipmentSafetyTestLogSchema, equipmentSafetyTestLogIdParamsSchema, listEquipmentSafetyTestLogsQuerySchema } = require('../schemas/equipment-safety-test-log.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentSafetyTestLogsQuerySchema }), equipmentSafetyTestLogController.listEquipmentSafetyTestLogs);
router.get('/:id', authenticate(), validateRequest({ params: equipmentSafetyTestLogIdParamsSchema }), equipmentSafetyTestLogController.getEquipmentSafetyTestLogById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentSafetyTestLogSchema }), equipmentSafetyTestLogController.createEquipmentSafetyTestLog);
router.put('/:id', authenticate(), validateRequest({ params: equipmentSafetyTestLogIdParamsSchema, body: updateEquipmentSafetyTestLogSchema }), equipmentSafetyTestLogController.updateEquipmentSafetyTestLog);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentSafetyTestLogIdParamsSchema }), equipmentSafetyTestLogController.deleteEquipmentSafetyTestLog);

module.exports = router;
