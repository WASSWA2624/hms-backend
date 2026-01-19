/**
 * Appointment reminder routes tests
 *
 * @module tests/modules/appointment-reminder/routes
 * @description Integration tests for appointment reminder routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

const request = require('supertest');
const express = require('express');
const appointmentReminderRoutes = require('@routes/appointment-reminder/appointment-reminder.routes');
const appointmentReminderController = require('@controllers/appointment-reminder/appointment-reminder.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/appointment-reminders', appointmentReminderRoutes);

// Mock dependencies
jest.mock('@controllers/appointment-reminder/appointment-reminder.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

describe('Appointment Reminder Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticate middleware to pass through
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id' };
      next();
    });

    // Mock validateRequest middleware to pass through
    validateRequest.mockImplementation(() => (req, res, next) => next());

    // Mock controller methods
    appointmentReminderController.listAppointmentReminders.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    appointmentReminderController.getAppointmentReminderById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    appointmentReminderController.createAppointmentReminder.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    appointmentReminderController.updateAppointmentReminder.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    appointmentReminderController.deleteAppointmentReminder.mockImplementation((req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/v1/appointment-reminders', () => {
    it('should list reminders', async () => {
      const response = await request(app).get('/api/v1/appointment-reminders');

      expect(response.status).toBe(200);
      expect(appointmentReminderController.listAppointmentReminders).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/appointment-reminders');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/appointment-reminders');

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.any(Object) })
      );
    });
  });

  describe('GET /api/v1/appointment-reminders/:id', () => {
    const reminderId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get reminder by ID', async () => {
      const response = await request(app).get(`/api/v1/appointment-reminders/${reminderId}`);

      expect(response.status).toBe(200);
      expect(appointmentReminderController.getAppointmentReminderById).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get(`/api/v1/appointment-reminders/${reminderId}`);

      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/appointment-reminders', () => {
    const reminderData = {
      appointment_id: '550e8400-e29b-41d4-a716-446655440000',
      channel: 'EMAIL',
      scheduled_at: '2026-01-20T08:00:00.000Z'
    };

    it('should create new reminder', async () => {
      const response = await request(app)
        .post('/api/v1/appointment-reminders')
        .send(reminderData);

      expect(response.status).toBe(201);
      expect(appointmentReminderController.createAppointmentReminder).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).post('/api/v1/appointment-reminders').send(reminderData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for body', async () => {
      await request(app).post('/api/v1/appointment-reminders').send(reminderData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.any(Object) })
      );
    });
  });

  describe('PUT /api/v1/appointment-reminders/:id', () => {
    const reminderId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = { channel: 'SMS' };

    it('should update reminder', async () => {
      const response = await request(app)
        .put(`/api/v1/appointment-reminders/${reminderId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(appointmentReminderController.updateAppointmentReminder).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app)
        .put(`/api/v1/appointment-reminders/${reminderId}`)
        .send(updateData);

      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/appointment-reminders/:id', () => {
    const reminderId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete reminder', async () => {
      const response = await request(app).delete(`/api/v1/appointment-reminders/${reminderId}`);

      expect(response.status).toBe(204);
      expect(appointmentReminderController.deleteAppointmentReminder).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).delete(`/api/v1/appointment-reminders/${reminderId}`);

      expect(authenticate).toHaveBeenCalled();
    });
  });
});
