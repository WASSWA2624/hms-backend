/**
 * Appointment reminder routes
 */

const express = require('express');
const router = express.Router();
const appointmentReminderController = require('@controllers/appointment-reminder/appointment-reminder.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createAppointmentReminderSchema,
  updateAppointmentReminderSchema,
  markAppointmentReminderSentSchema,
  appointmentReminderIdParamsSchema,
  listAppointmentRemindersQuerySchema
} = require('@validations/appointment-reminder/appointment-reminder.schema');

router.get(
  '/',  validateRequest({ query: listAppointmentRemindersQuerySchema }),

  authenticate(),
  appointmentReminderController.listAppointmentReminders
);

router.get(
  '/:id',  validateRequest({ params: appointmentReminderIdParamsSchema }),

  authenticate(),
  appointmentReminderController.getAppointmentReminderById
);

router.post(
  '/',  validateRequest({ body: createAppointmentReminderSchema }),

  authenticate(),
  appointmentReminderController.createAppointmentReminder
);

router.put(
  '/:id',  validateRequest({ params: appointmentReminderIdParamsSchema, body: updateAppointmentReminderSchema }),

  authenticate(),
  appointmentReminderController.updateAppointmentReminder
);

router.delete(
  '/:id',  validateRequest({ params: appointmentReminderIdParamsSchema }),

  authenticate(),
  appointmentReminderController.deleteAppointmentReminder
);

router.post(
  '/:id/mark-sent',  validateRequest({ params: appointmentReminderIdParamsSchema, body: markAppointmentReminderSentSchema }),

  authenticate(),
  appointmentReminderController.markAppointmentReminderSent
);

module.exports = router;
