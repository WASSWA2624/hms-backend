const express = require('express');
const router = express.Router();
const equipmentIncidentReportController = require('../controllers/equipment-incident-report.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentIncidentReportSchema, updateEquipmentIncidentReportSchema, equipmentIncidentReportIdParamsSchema, listEquipmentIncidentReportsQuerySchema } = require('../schemas/equipment-incident-report.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentIncidentReportsQuerySchema }), equipmentIncidentReportController.listEquipmentIncidentReports);
router.get('/:id', authenticate(), validateRequest({ params: equipmentIncidentReportIdParamsSchema }), equipmentIncidentReportController.getEquipmentIncidentReportById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentIncidentReportSchema }), equipmentIncidentReportController.createEquipmentIncidentReport);
router.put('/:id', authenticate(), validateRequest({ params: equipmentIncidentReportIdParamsSchema, body: updateEquipmentIncidentReportSchema }), equipmentIncidentReportController.updateEquipmentIncidentReport);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentIncidentReportIdParamsSchema }), equipmentIncidentReportController.deleteEquipmentIncidentReport);

module.exports = router;
