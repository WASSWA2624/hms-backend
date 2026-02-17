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

router.get('/', validateRequest({ query: listShiftTemplatesQuerySchema }), authenticate(), shiftTemplateController.list);
router.get('/:id', validateRequest({ params: shiftTemplateIdParamsSchema }), authenticate(), shiftTemplateController.getById);
router.post('/', validateRequest({ body: createShiftTemplateSchema }), authenticate(), shiftTemplateController.create);
router.put('/:id', validateRequest({ params: shiftTemplateIdParamsSchema, body: updateShiftTemplateSchema }), authenticate(), shiftTemplateController.update);
router.delete('/:id', validateRequest({ params: shiftTemplateIdParamsSchema }), authenticate(), shiftTemplateController.remove);

module.exports = router;

