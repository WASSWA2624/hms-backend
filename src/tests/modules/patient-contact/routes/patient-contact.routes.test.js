/**
 * Patient Contact routes tests
 *
 * @module tests/modules/patient-contact/routes
 * @description Tests for patient contact API endpoints
 * Per testing.mdc: Route tests must verify middleware application and endpoint behavior
 */

const express = require('express');
const request = require('supertest');
const patientContactRoutes = require('@routes/patient-contact/patient-contact.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');
jest.mock('@controllers/patient-contact/patient-contact.controller', () => ({
  listPatientContacts: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPatientContactById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createPatientContact: jest.fn((req, res) => res.status(201).json({ success: true })),
  updatePatientContact: jest.fn((req, res) => res.status(200).json({ success: true })),
  deletePatientContact: jest.fn((req, res) => res.status(204).send())
}));

describe('Patient Contact Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.mockImplementation(() => (req, res, next) => next());
    validateRequest.mockImplementation(() => (req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use('/api/v1/patient-contacts', patientContactRoutes);
  });

  describe('GET /api/v1/patient-contacts', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/patient-contacts');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/patient-contacts');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/patient-contacts/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/patient-contacts/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/patient-contacts', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .post('/api/v1/patient-contacts')
        .send({ tenant_id: '123', patient_id: '456', contact_type: 'PHONE', value: '+256700000000' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/patient-contacts')
        .send({ tenant_id: '123', patient_id: '456', contact_type: 'PHONE', value: '+256700000000' });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/patient-contacts/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .put('/api/v1/patient-contacts/123')
        .send({ value: 'updated@example.com' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/patient-contacts/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).delete('/api/v1/patient-contacts/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/patient-contacts/123');
      expect(response.status).toBe(204);
    });
  });
});
