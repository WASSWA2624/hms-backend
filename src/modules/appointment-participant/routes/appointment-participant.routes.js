/**
 * Appointment participant routes
 *
 * @module modules/appointment-participant/routes
 * @description Appointment participant endpoints mounted at /api/v1/appointment-participants
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const appointmentParticipantController = require('@controllers/appointment-participant/appointment-participant.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createAppointmentParticipantSchema,
  updateAppointmentParticipantSchema,
  appointmentParticipantIdParamsSchema,
  listAppointmentParticipantsQuerySchema
} = require('@validations/appointment-participant/appointment-participant.schema');

/**
 * @description List appointment participants with pagination and filters
 * @method GET
 * @route /api/v1/appointment-participants/
 */
router.get(
  '/',  validateRequest({ query: listAppointmentParticipantsQuerySchema }),

  authenticate(),
  appointmentParticipantController.listAppointmentParticipants
);

/**
 * @description Get appointment participant by ID
 * @method GET
 * @route /api/v1/appointment-participants/:id
 */
router.get(
  '/:id',  validateRequest({ params: appointmentParticipantIdParamsSchema }),

  authenticate(),
  appointmentParticipantController.getAppointmentParticipantById
);

/**
 * @description Create new appointment participant
 * @method POST
 * @route /api/v1/appointment-participants/
 */
router.post(
  '/',  validateRequest({ body: createAppointmentParticipantSchema }),

  authenticate(),
  appointmentParticipantController.createAppointmentParticipant
);

/**
 * @description Update appointment participant
 * @method PUT
 * @route /api/v1/appointment-participants/:id
 */
router.put(
  '/:id',  validateRequest({ params: appointmentParticipantIdParamsSchema, body: updateAppointmentParticipantSchema }),

  authenticate(),
  appointmentParticipantController.updateAppointmentParticipant
);

/**
 * @description Delete appointment participant (soft delete)
 * @method DELETE
 * @route /api/v1/appointment-participants/:id
 */
router.delete(
  '/:id',  validateRequest({ params: appointmentParticipantIdParamsSchema }),

  authenticate(),
  appointmentParticipantController.deleteAppointmentParticipant
);

module.exports = router;
