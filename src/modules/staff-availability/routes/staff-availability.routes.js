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

router.get('/', validateRequest({ query: listStaffAvailabilitiesQuerySchema }), authenticate(), staffAvailabilityController.list);
router.get('/:id', validateRequest({ params: staffAvailabilityIdParamsSchema }), authenticate(), staffAvailabilityController.getById);
router.post('/', validateRequest({ body: createStaffAvailabilitySchema }), authenticate(), staffAvailabilityController.create);
router.put('/:id', validateRequest({ params: staffAvailabilityIdParamsSchema, body: updateStaffAvailabilitySchema }), authenticate(), staffAvailabilityController.update);
router.delete('/:id', validateRequest({ params: staffAvailabilityIdParamsSchema }), authenticate(), staffAvailabilityController.remove);

module.exports = router;

