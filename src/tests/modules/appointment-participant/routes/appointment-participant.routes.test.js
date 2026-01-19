/**
 * Appointment participant routes tests
 *
 * @module tests/modules/appointment-participant/routes
 * @description Integration tests for appointment participant routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

const request = require('supertest');
const express = require('express');
const appointmentParticipantRoutes = require('@routes/appointment-participant/appointment-participant.routes');
const appointmentParticipantController = require('@controllers/appointment-participant/appointment-participant.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/appointment-participants', appointmentParticipantRoutes);

// Mock dependencies
jest.mock('@controllers/appointment-participant/appointment-participant.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

describe('Appointment Participant Routes', () => {
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
    appointmentParticipantController.listAppointmentParticipants.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    appointmentParticipantController.getAppointmentParticipantById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    appointmentParticipantController.createAppointmentParticipant.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    appointmentParticipantController.updateAppointmentParticipant.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    appointmentParticipantController.deleteAppointmentParticipant.mockImplementation((req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/v1/appointment-participants', () => {
    it('should list participants', async () => {
      const response = await request(app).get('/api/v1/appointment-participants');

      expect(response.status).toBe(200);
      expect(appointmentParticipantController.listAppointmentParticipants).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/appointment-participants');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/appointment-participants');

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.any(Object) })
      );
    });
  });

  describe('GET /api/v1/appointment-participants/:id', () => {
    const participantId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get participant by ID', async () => {
      const response = await request(app).get(`/api/v1/appointment-participants/${participantId}`);

      expect(response.status).toBe(200);
      expect(appointmentParticipantController.getAppointmentParticipantById).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get(`/api/v1/appointment-participants/${participantId}`);

      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/appointment-participants', () => {
    const participantData = {
      appointment_id: '550e8400-e29b-41d4-a716-446655440000',
      participant_user_id: '550e8400-e29b-41d4-a716-446655440001',
      role: 'Provider'
    };

    it('should create new participant', async () => {
      const response = await request(app)
        .post('/api/v1/appointment-participants')
        .send(participantData);

      expect(response.status).toBe(201);
      expect(appointmentParticipantController.createAppointmentParticipant).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).post('/api/v1/appointment-participants').send(participantData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for body', async () => {
      await request(app).post('/api/v1/appointment-participants').send(participantData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.any(Object) })
      );
    });
  });

  describe('PUT /api/v1/appointment-participants/:id', () => {
    const participantId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = { role: 'Lead Provider' };

    it('should update participant', async () => {
      const response = await request(app)
        .put(`/api/v1/appointment-participants/${participantId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(appointmentParticipantController.updateAppointmentParticipant).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app)
        .put(`/api/v1/appointment-participants/${participantId}`)
        .send(updateData);

      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/appointment-participants/:id', () => {
    const participantId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete participant', async () => {
      const response = await request(app).delete(`/api/v1/appointment-participants/${participantId}`);

      expect(response.status).toBe(204);
      expect(appointmentParticipantController.deleteAppointmentParticipant).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).delete(`/api/v1/appointment-participants/${participantId}`);

      expect(authenticate).toHaveBeenCalled();
    });
  });
});
