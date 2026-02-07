/**
 * Shift template routes
 */
const express = require('express');
const router = express.Router();
const shiftTemplateController = require('@controllers/shift-template/shift-template.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createShiftTemplateSchema,
  updateShiftTemplateSchema,
  shiftTemplateIdParamsSchema,
  listShiftTemplatesQuerySchema
} = require('@validations/shift-template/shift-template.schema');

router.get('/', authenticate(), validateRequest({ query: listShiftTemplatesQuerySchema }), shiftTemplateController.list);
router.get('/:id', authenticate(), validateRequest({ params: shiftTemplateIdParamsSchema }), shiftTemplateController.getById);
router.post('/', authenticate(), validateRequest({ body: createShiftTemplateSchema }), shiftTemplateController.create);
router.put('/:id', authenticate(), validateRequest({ params: shiftTemplateIdParamsSchema, body: updateShiftTemplateSchema }), shiftTemplateController.update);
router.delete('/:id', authenticate(), validateRequest({ params: shiftTemplateIdParamsSchema }), shiftTemplateController.remove);

module.exports = router;
