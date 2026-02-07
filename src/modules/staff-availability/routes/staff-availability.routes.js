/**
 * Staff availability routes
 */
const express = require('express');
const router = express.Router();
const staffAvailabilityController = require('@controllers/staff-availability/staff-availability.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createStaffAvailabilitySchema,
  updateStaffAvailabilitySchema,
  staffAvailabilityIdParamsSchema,
  listStaffAvailabilitiesQuerySchema
} = require('@validations/staff-availability/staff-availability.schema');

router.get('/', authenticate(), validateRequest({ query: listStaffAvailabilitiesQuerySchema }), staffAvailabilityController.list);
router.get('/:id', authenticate(), validateRequest({ params: staffAvailabilityIdParamsSchema }), staffAvailabilityController.getById);
router.post('/', authenticate(), validateRequest({ body: createStaffAvailabilitySchema }), staffAvailabilityController.create);
router.put('/:id', authenticate(), validateRequest({ params: staffAvailabilityIdParamsSchema, body: updateStaffAvailabilitySchema }), staffAvailabilityController.update);
router.delete('/:id', authenticate(), validateRequest({ params: staffAvailabilityIdParamsSchema }), staffAvailabilityController.remove);

module.exports = router;
