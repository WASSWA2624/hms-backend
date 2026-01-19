/**
 * Patient Identifier routes tests
 *
 * @module tests/modules/patient-identifier/routes
 * @description Tests for patient identifier API endpoints
 * Per testing.mdc: Route tests must verify middleware application and endpoint behavior
 */

const express = require('express');
const request = require('supertest');
const patientIdentifierRoutes = require('@routes/patient-identifier/patient-identifier.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');
jest.mock('@controllers/patient-identifier/patient-identifier.controller', () => ({
  listPatientIdentifiers: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPatientIdentifierById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createPatientIdentifier: jest.fn((req, res) => res.status(201).json({ success: true })),
  updatePatientIdentifier: jest.fn((req, res) => res.status(200).json({ success: true })),
  deletePatientIdentifier: jest.fn((req, res) => res.status(204).send())
}));

describe('Patient Identifier Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.mockImplementation(() => (req, res, next) => next());
    validateRequest.mockImplementation(() => (req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use('/api/v1/patient-identifiers', patientIdentifierRoutes);
  });

  describe('GET /api/v1/patient-identifiers', () => {
    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/patient-identifiers');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/patient-identifiers');
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/patient-identifiers');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/patient-identifiers/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/patient-identifiers/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/patient-identifiers/123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/patient-identifiers', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .post('/api/v1/patient-identifiers')
        .send({ tenant_id: '123', patient_id: '456', identifier_type: 'MRN', identifier_value: 'MRN123' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/patient-identifiers')
        .send({ tenant_id: '123', patient_id: '456', identifier_type: 'MRN', identifier_value: 'MRN123' });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/patient-identifiers/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .put('/api/v1/patient-identifiers/123')
        .send({ identifier_value: 'UPDATED' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app)
        .put('/api/v1/patient-identifiers/123')
        .send({ identifier_value: 'UPDATED' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/patient-identifiers/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).delete('/api/v1/patient-identifiers/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/patient-identifiers/123');
      expect(response.status).toBe(204);
    });
  });
});
