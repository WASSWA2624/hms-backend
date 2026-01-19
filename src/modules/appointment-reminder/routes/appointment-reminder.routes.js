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
  appointmentReminderIdParamsSchema,
  listAppointmentRemindersQuerySchema
} = require('@validations/appointment-reminder/appointment-reminder.schema');

router.get(
  '/',
  authenticate(),
  validateRequest({ query: listAppointmentRemindersQuerySchema }),
  appointmentReminderController.listAppointmentReminders
);

router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: appointmentReminderIdParamsSchema }),
  appointmentReminderController.getAppointmentReminderById
);

router.post(
  '/',
  authenticate(),
  validateRequest({ body: createAppointmentReminderSchema }),
  appointmentReminderController.createAppointmentReminder
);

router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: appointmentReminderIdParamsSchema, body: updateAppointmentReminderSchema }),
  appointmentReminderController.updateAppointmentReminder
);

router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: appointmentReminderIdParamsSchema }),
  appointmentReminderController.deleteAppointmentReminder
);

module.exports = router;
