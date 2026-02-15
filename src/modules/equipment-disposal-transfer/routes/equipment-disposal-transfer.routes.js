const express = require('express');
const router = express.Router();
const equipmentDisposalTransferController = require('../controllers/equipment-disposal-transfer.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentDisposalTransferSchema, updateEquipmentDisposalTransferSchema, equipmentDisposalTransferIdParamsSchema, listEquipmentDisposalTransfersQuerySchema } = require('../schemas/equipment-disposal-transfer.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentDisposalTransfersQuerySchema }), equipmentDisposalTransferController.listEquipmentDisposalTransfers);
router.get('/:id', authenticate(), validateRequest({ params: equipmentDisposalTransferIdParamsSchema }), equipmentDisposalTransferController.getEquipmentDisposalTransferById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentDisposalTransferSchema }), equipmentDisposalTransferController.createEquipmentDisposalTransfer);
router.put('/:id', authenticate(), validateRequest({ params: equipmentDisposalTransferIdParamsSchema, body: updateEquipmentDisposalTransferSchema }), equipmentDisposalTransferController.updateEquipmentDisposalTransfer);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentDisposalTransferIdParamsSchema }), equipmentDisposalTransferController.deleteEquipmentDisposalTransfer);

module.exports = router;
