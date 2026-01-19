/**
 * Critical Alert routes tests
 *
 * @module tests/modules/critical-alert/routes
 * @description Tests for critical alert API endpoints
 * Per testing.mdc: Route tests must verify middleware application and endpoint behavior
 */

const express = require('express');
const request = require('supertest');

// Mock dependencies before importing routes
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');
jest.mock('@controllers/critical-alert/critical-alert.controller', () => ({
  listCriticalAlerts: jest.fn((req, res) => res.status(200).json({ success: true })),
  getCriticalAlertById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createCriticalAlert: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateCriticalAlert: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteCriticalAlert: jest.fn((req, res) => res.status(204).send())
}));

const criticalAlertRoutes = require('@routes/critical-alert/critical-alert.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

describe('Critical Alert Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.mockImplementation(() => (req, res, next) => next());
    validateRequest.mockImplementation(() => (req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use('/api/v1/critical-alerts', criticalAlertRoutes);
  });

  describe('GET /api/v1/critical-alerts', () => {
    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/critical-alerts');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/critical-alerts');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/critical-alerts/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/critical-alerts/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/critical-alerts/123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/critical-alerts', () => {
    it('should return 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/critical-alerts')
        .send({ icu_stay_id: '123', severity: 'CRITICAL', message: 'Test' });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/critical-alerts/:id', () => {
    it('should return 200 status', async () => {
      const response = await request(app)
        .put('/api/v1/critical-alerts/123')
        .send({ severity: 'HIGH' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/critical-alerts/:id', () => {
    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/critical-alerts/123');
      expect(response.status).toBe(204);
    });
  });
});
