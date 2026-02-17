const express = require('express');
const router = express.Router();
const equipmentCategoryController = require('@controllers/equipment-category/equipment-category.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const { createEquipmentCategorySchema, updateEquipmentCategorySchema, equipmentCategoryIdParamsSchema, listEquipmentCategorysQuerySchema } = require('@validations/equipment-category/equipment-category.schema');

router.get('/', authenticate(), validateRequest({ query: listEquipmentCategorysQuerySchema }), equipmentCategoryController.listEquipmentCategorys);
router.get('/:id', authenticate(), validateRequest({ params: equipmentCategoryIdParamsSchema }), equipmentCategoryController.getEquipmentCategoryById);
router.post('/', authenticate(), validateRequest({ body: createEquipmentCategorySchema }), equipmentCategoryController.createEquipmentCategory);
router.put('/:id', authenticate(), validateRequest({ params: equipmentCategoryIdParamsSchema, body: updateEquipmentCategorySchema }), equipmentCategoryController.updateEquipmentCategory);
router.delete('/:id', authenticate(), validateRequest({ params: equipmentCategoryIdParamsSchema }), equipmentCategoryController.deleteEquipmentCategory);

module.exports = router;
