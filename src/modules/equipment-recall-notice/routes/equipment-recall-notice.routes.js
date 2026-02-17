const express = require('express');
const router = express.Router();
const equipmentRecallNoticeController = require('@controllers/equipment-recall-notice/equipment-recall-notice.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentRecallNoticeSchema, updateEquipmentRecallNoticeSchema, equipmentRecallNoticeIdParamsSchema, listEquipmentRecallNoticesQuerySchema } = require('@validations/equipment-recall-notice/equipment-recall-notice.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentRecallNoticesQuerySchema }), equipmentRecallNoticeController.listEquipmentRecallNotices);
router.get('/:id', authenticate(), validateRequest({ params: equipmentRecallNoticeIdParamsSchema }), equipmentRecallNoticeController.getEquipmentRecallNoticeById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentRecallNoticeSchema }), equipmentRecallNoticeController.createEquipmentRecallNotice);
router.put('/:id', authenticate(), validateRequest({ params: equipmentRecallNoticeIdParamsSchema, body: updateEquipmentRecallNoticeSchema }), equipmentRecallNoticeController.updateEquipmentRecallNotice);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentRecallNoticeIdParamsSchema }), equipmentRecallNoticeController.deleteEquipmentRecallNotice);

module.exports = router;
