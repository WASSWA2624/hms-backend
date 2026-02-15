const express = require('express');
const router = express.Router();
const equipmentUtilizationSnapshotController = require('../controllers/equipment-utilization-snapshot.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentUtilizationSnapshotSchema, updateEquipmentUtilizationSnapshotSchema, equipmentUtilizationSnapshotIdParamsSchema, listEquipmentUtilizationSnapshotsQuerySchema } = require('../schemas/equipment-utilization-snapshot.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentUtilizationSnapshotsQuerySchema }), equipmentUtilizationSnapshotController.listEquipmentUtilizationSnapshots);
router.get('/:id', authenticate(), validateRequest({ params: equipmentUtilizationSnapshotIdParamsSchema }), equipmentUtilizationSnapshotController.getEquipmentUtilizationSnapshotById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentUtilizationSnapshotSchema }), equipmentUtilizationSnapshotController.createEquipmentUtilizationSnapshot);
router.put('/:id', authenticate(), validateRequest({ params: equipmentUtilizationSnapshotIdParamsSchema, body: updateEquipmentUtilizationSnapshotSchema }), equipmentUtilizationSnapshotController.updateEquipmentUtilizationSnapshot);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentUtilizationSnapshotIdParamsSchema }), equipmentUtilizationSnapshotController.deleteEquipmentUtilizationSnapshot);

module.exports = router;
