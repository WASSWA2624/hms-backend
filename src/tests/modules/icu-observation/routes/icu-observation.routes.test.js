/**
 * ICU Observation routes tests
 *
 * @module tests/modules/icu-observation/routes
 * @description Tests for ICU observation API endpoints
 * Per testing.mdc: Route tests must verify middleware application and endpoint behavior
 */

const express = require('express');
const request = require('supertest');

// Mock dependencies before importing routes
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');
jest.mock('@controllers/icu-observation/icu-observation.controller', () => ({
  listIcuObservations: jest.fn((req, res) => res.status(200).json({ success: true })),
  getIcuObservationById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createIcuObservation: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateIcuObservation: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteIcuObservation: jest.fn((req, res) => res.status(204).send())
}));

const icuObservationRoutes = require('@routes/icu-observation/icu-observation.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

describe('ICU Observation Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.mockImplementation(() => (req, res, next) => next());
    validateRequest.mockImplementation(() => (req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use('/api/v1/icu-observations', icuObservationRoutes);
  });

  describe('GET /api/v1/icu-observations', () => {
    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/icu-observations');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/icu-observations');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/icu-observations/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/icu-observations/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/icu-observations/123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/icu-observations', () => {
    it('should return 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/icu-observations')
        .send({ icu_stay_id: '123', observation: 'Test' });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/icu-observations/:id', () => {
    it('should return 200 status', async () => {
      const response = await request(app)
        .put('/api/v1/icu-observations/123')
        .send({ observation: 'Updated' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/icu-observations/:id', () => {
    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/icu-observations/123');
      expect(response.status).toBe(204);
    });
  });
});
