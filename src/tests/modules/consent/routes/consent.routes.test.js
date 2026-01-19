/**
 * Consent routes tests
 *
 * @module tests/modules/consent/routes
 * @description Integration tests for consent routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

const request = require('supertest');
const express = require('express');
const consentRoutes = require('@routes/consent/consent.routes');
const consentController = require('@controllers/consent/consent.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/consents', consentRoutes);

// Mock dependencies
jest.mock('@controllers/consent/consent.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

describe('Consent Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id', tenant_id: 'tenant-123' };
      next();
    });

    validateRequest.mockImplementation(() => (req, res, next) => next());

    consentController.listConsents.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    consentController.getConsentById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    consentController.createConsent.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    consentController.updateConsent.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    consentController.deleteConsent.mockImplementation((req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/v1/consents', () => {
    it('should list consents', async () => {
      const response = await request(app).get('/api/v1/consents');

      expect(response.status).toBe(200);
      expect(consentController.listConsents).toHaveBeenCalled();
    });

    it('should apply authentication and validation middlewares', async () => {
      await request(app).get('/api/v1/consents');

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/api/v1/consents')
        .query({
          patient_id: '550e8400-e29b-41d4-a716-446655440000',
          consent_type: 'TREATMENT',
          status: 'GRANTED'
        });

      expect(consentController.listConsents).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/consents/:id', () => {
    const consentId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get consent by ID', async () => {
      const response = await request(app).get(`/api/v1/consents/${consentId}`);

      expect(response.status).toBe(200);
      expect(consentController.getConsentById).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app).get(`/api/v1/consents/${consentId}`);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/consents', () => {
    const consentData = {
      patient_id: '550e8400-e29b-41d4-a716-446655440000',
      consent_type: 'TREATMENT',
      status: 'GRANTED'
    };

    it('should create consent', async () => {
      const response = await request(app)
        .post('/api/v1/consents')
        .send(consentData);

      expect(response.status).toBe(201);
      expect(consentController.createConsent).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app)
        .post('/api/v1/consents')
        .send(consentData);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/consents/:id', () => {
    const consentId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      status: 'REVOKED'
    };

    it('should update consent', async () => {
      const response = await request(app)
        .put(`/api/v1/consents/${consentId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(consentController.updateConsent).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app)
        .put(`/api/v1/consents/${consentId}`)
        .send(updateData);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/consents/:id', () => {
    const consentId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete consent', async () => {
      const response = await request(app).delete(`/api/v1/consents/${consentId}`);

      expect(response.status).toBe(204);
      expect(consentController.deleteConsent).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app).delete(`/api/v1/consents/${consentId}`);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
