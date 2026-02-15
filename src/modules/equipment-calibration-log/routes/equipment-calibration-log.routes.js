const express = require('express');
const router = express.Router();
const equipmentCalibrationLogController = require('../controllers/equipment-calibration-log.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentCalibrationLogSchema, updateEquipmentCalibrationLogSchema, equipmentCalibrationLogIdParamsSchema, listEquipmentCalibrationLogsQuerySchema } = require('../schemas/equipment-calibration-log.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentCalibrationLogsQuerySchema }), equipmentCalibrationLogController.listEquipmentCalibrationLogs);
router.get('/:id', authenticate(), validateRequest({ params: equipmentCalibrationLogIdParamsSchema }), equipmentCalibrationLogController.getEquipmentCalibrationLogById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentCalibrationLogSchema }), equipmentCalibrationLogController.createEquipmentCalibrationLog);
router.put('/:id', authenticate(), validateRequest({ params: equipmentCalibrationLogIdParamsSchema, body: updateEquipmentCalibrationLogSchema }), equipmentCalibrationLogController.updateEquipmentCalibrationLog);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentCalibrationLogIdParamsSchema }), equipmentCalibrationLogController.deleteEquipmentCalibrationLog);

module.exports = router;
