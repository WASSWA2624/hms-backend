/**
 * Terms acceptance routes tests
 *
 * @module tests/modules/terms-acceptance/routes
 * @description Integration tests for terms acceptance routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

const request = require('supertest');
const express = require('express');
const termsAcceptanceRoutes = require('@routes/terms-acceptance/terms-acceptance.routes');
const termsAcceptanceController = require('@controllers/terms-acceptance/terms-acceptance.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/terms-acceptances', termsAcceptanceRoutes);

// Mock dependencies
jest.mock('@controllers/terms-acceptance/terms-acceptance.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

describe('Terms Acceptance Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id', tenant_id: 'tenant-123' };
      next();
    });

    validateRequest.mockImplementation(() => (req, res, next) => next());

    termsAcceptanceController.listTermsAcceptances.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    termsAcceptanceController.getTermsAcceptanceById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    termsAcceptanceController.createTermsAcceptance.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    termsAcceptanceController.deleteTermsAcceptance.mockImplementation((req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/v1/terms-acceptances', () => {
    it('should list terms acceptances', async () => {
      const response = await request(app).get('/api/v1/terms-acceptances');

      expect(response.status).toBe(200);
      expect(termsAcceptanceController.listTermsAcceptances).toHaveBeenCalled();
    });

    it('should apply authentication and validation middlewares', async () => {
      await request(app).get('/api/v1/terms-acceptances');

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/api/v1/terms-acceptances')
        .query({
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          version_label: 'v1.0.0'
        });

      expect(termsAcceptanceController.listTermsAcceptances).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/terms-acceptances/:id', () => {
    const taId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get terms acceptance by ID', async () => {
      const response = await request(app).get(`/api/v1/terms-acceptances/${taId}`);

      expect(response.status).toBe(200);
      expect(termsAcceptanceController.getTermsAcceptanceById).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app).get(`/api/v1/terms-acceptances/${taId}`);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/terms-acceptances', () => {
    const taData = {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      version_label: 'v1.0.0'
    };

    it('should create terms acceptance', async () => {
      const response = await request(app)
        .post('/api/v1/terms-acceptances')
        .send(taData);

      expect(response.status).toBe(201);
      expect(termsAcceptanceController.createTermsAcceptance).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app)
        .post('/api/v1/terms-acceptances')
        .send(taData);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/terms-acceptances/:id', () => {
    const taId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete terms acceptance', async () => {
      const response = await request(app).delete(`/api/v1/terms-acceptances/${taId}`);

      expect(response.status).toBe(204);
      expect(termsAcceptanceController.deleteTermsAcceptance).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app).delete(`/api/v1/terms-acceptances/${taId}`);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
