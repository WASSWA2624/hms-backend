/**
 * Appointment routes tests
 *
 * @module tests/modules/appointment/routes
 * @description Integration tests for appointment routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

const request = require('supertest');
const express = require('express');
const appointmentRoutes = require('@routes/appointment/appointment.routes');
const appointmentController = require('@controllers/appointment/appointment.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/appointments', appointmentRoutes);

// Mock dependencies
jest.mock('@controllers/appointment/appointment.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

describe('Appointment Routes', () => {
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
    appointmentController.listAppointments.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    appointmentController.getAppointmentById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    appointmentController.createAppointment.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    appointmentController.updateAppointment.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    appointmentController.deleteAppointment.mockImplementation((req, res) => {
      res.status(204).send();
    });
    appointmentController.cancelAppointment.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
  });

  describe('GET /api/v1/appointments', () => {
    it('should list appointments', async () => {
      const response = await request(app).get('/api/v1/appointments');

      expect(response.status).toBe(200);
      expect(appointmentController.listAppointments).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/appointments');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/appointments');

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.any(Object) })
      );
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/api/v1/appointments')
        .query({
          page: '1',
          limit: '20',
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          patient_id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'SCHEDULED',
          search: 'checkup'
        });

      expect(appointmentController.listAppointments).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/appointments/:id', () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get appointment by ID', async () => {
      const response = await request(app).get(`/api/v1/appointments/${appointmentId}`);

      expect(response.status).toBe(200);
      expect(appointmentController.getAppointmentById).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get(`/api/v1/appointments/${appointmentId}`);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params', async () => {
      await request(app).get(`/api/v1/appointments/${appointmentId}`);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });

  describe('POST /api/v1/appointments', () => {
    const appointmentData = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      patient_id: '550e8400-e29b-41d4-a716-446655440001',
      status: 'SCHEDULED',
      scheduled_start: '2026-01-20T09:00:00.000Z',
      scheduled_end: '2026-01-20T10:00:00.000Z',
      reason: 'General checkup'
    };

    it('should create new appointment', async () => {
      const response = await request(app)
        .post('/api/v1/appointments')
        .send(appointmentData);

      expect(response.status).toBe(201);
      expect(appointmentController.createAppointment).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).post('/api/v1/appointments').send(appointmentData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for body', async () => {
      await request(app).post('/api/v1/appointments').send(appointmentData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.any(Object) })
      );
    });

    it('should accept JSON body', async () => {
      const response = await request(app)
        .post('/api/v1/appointments')
        .send(appointmentData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/appointments/:id', () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      status: 'CONFIRMED'
    };

    it('should update appointment', async () => {
      const response = await request(app)
        .put(`/api/v1/appointments/${appointmentId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(appointmentController.updateAppointment).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app)
        .put(`/api/v1/appointments/${appointmentId}`)
        .send(updateData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params and body', async () => {
      await request(app)
        .put(`/api/v1/appointments/${appointmentId}`)
        .send(updateData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.any(Object),
          body: expect.any(Object)
        })
      );
    });
  });

  describe('DELETE /api/v1/appointments/:id', () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete appointment', async () => {
      const response = await request(app).delete(`/api/v1/appointments/${appointmentId}`);

      expect(response.status).toBe(204);
      expect(appointmentController.deleteAppointment).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).delete(`/api/v1/appointments/${appointmentId}`);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params', async () => {
      await request(app).delete(`/api/v1/appointments/${appointmentId}`);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });

  describe('POST /api/v1/appointments/:id/cancel', () => {
    const appointmentId = '550e8400-e29b-41d4-a716-446655440000';
    const cancelData = {
      reason: 'Patient request'
    };

    it('should cancel appointment with reason', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${appointmentId}/cancel`)
        .send(cancelData);

      expect(response.status).toBe(200);
      expect(appointmentController.cancelAppointment).toHaveBeenCalled();
    });

    it('should cancel appointment without reason', async () => {
      const response = await request(app)
        .post(`/api/v1/appointments/${appointmentId}/cancel`)
        .send({});

      expect(response.status).toBe(200);
      expect(appointmentController.cancelAppointment).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app)
        .post(`/api/v1/appointments/${appointmentId}/cancel`)
        .send(cancelData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params and body', async () => {
      await request(app)
        .post(`/api/v1/appointments/${appointmentId}/cancel`)
        .send(cancelData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.any(Object),
          body: expect.any(Object)
        })
      );
    });
  });
});
