/**
 * Patient routes tests
 *
 * @module tests/modules/patient/routes
 * @description Tests for patient API endpoints
 * Per testing.mdc: Route tests must verify middleware application and endpoint behavior
 */

const express = require('express');
const request = require('supertest');
const patientRoutes = require('@routes/patient/patient.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');
jest.mock('@controllers/patient/patient.controller', () => ({
  listPatients: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPatientById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createPatient: jest.fn((req, res) => res.status(201).json({ success: true })),
  updatePatient: jest.fn((req, res) => res.status(200).json({ success: true })),
  deletePatient: jest.fn((req, res) => res.status(204).send())
}));

describe('Patient Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.mockImplementation(() => (req, res, next) => next());
    validateRequest.mockImplementation(() => (req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use('/api/v1/patients', patientRoutes);
  });

  describe('GET /api/v1/patients', () => {
    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/patients');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/patients');
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/patients');
      expect(response.status).toBe(200);
    });

    it('should accept query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/patients')
        .query({ page: 1, limit: 20, search: 'John' });
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/patients/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/patients/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/patients/123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/patients', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .post('/api/v1/patients')
        .send({
          tenant_id: '123',
          first_name: 'John',
          last_name: 'Doe',
          gender: 'MALE'
        });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/patients')
        .send({
          tenant_id: '123',
          first_name: 'John',
          last_name: 'Doe',
          gender: 'MALE'
        });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/patients/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .put('/api/v1/patients/123')
        .send({ first_name: 'Jane' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app)
        .put('/api/v1/patients/123')
        .send({ first_name: 'Jane' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/patients/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).delete('/api/v1/patients/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/patients/123');
      expect(response.status).toBe(204);
    });
  });
});
