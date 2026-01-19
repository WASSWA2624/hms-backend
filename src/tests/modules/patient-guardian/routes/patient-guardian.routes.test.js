/**
 * Patient Guardian routes tests
 *
 * @module tests/modules/patient-guardian/routes
 * @description Tests for patient guardian API endpoints
 * Per testing.mdc: Route tests must verify middleware application and endpoint behavior
 */

const express = require('express');
const request = require('supertest');
const patientGuardianRoutes = require('@routes/patient-guardian/patient-guardian.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');
jest.mock('@controllers/patient-guardian/patient-guardian.controller', () => ({
  listPatientGuardians: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPatientGuardianById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createPatientGuardian: jest.fn((req, res) => res.status(201).json({ success: true })),
  updatePatientGuardian: jest.fn((req, res) => res.status(200).json({ success: true })),
  deletePatientGuardian: jest.fn((req, res) => res.status(204).send())
}));

describe('Patient Guardian Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.mockImplementation(() => (req, res, next) => next());
    validateRequest.mockImplementation(() => (req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use('/api/v1/patient-guardians', patientGuardianRoutes);
  });

  describe('GET /api/v1/patient-guardians', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/patient-guardians');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/patient-guardians');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/patient-guardians/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/patient-guardians/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/patient-guardians/123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/patient-guardians', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .post('/api/v1/patient-guardians')
        .send({
          tenant_id: '123',
          patient_id: '456',
          name: 'Jane Doe',
          relationship: 'Mother'
        });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/patient-guardians')
        .send({
          tenant_id: '123',
          patient_id: '456',
          name: 'Jane Doe',
          relationship: 'Mother'
        });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/patient-guardians/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .put('/api/v1/patient-guardians/123')
        .send({ name: 'Jane Smith' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app)
        .put('/api/v1/patient-guardians/123')
        .send({ name: 'Jane Smith' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/patient-guardians/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).delete('/api/v1/patient-guardians/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/patient-guardians/123');
      expect(response.status).toBe(204);
    });
  });
});
