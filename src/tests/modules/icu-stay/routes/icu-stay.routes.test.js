/**
 * ICU Stay routes tests
 *
 * @module tests/modules/icu-stay/routes
 * @description Tests for ICU stay API endpoints
 * Per testing.mdc: Route tests must verify middleware application and endpoint behavior
 */

const express = require('express');
const request = require('supertest');

// Mock dependencies before importing routes
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');
jest.mock('@controllers/icu-stay/icu-stay.controller', () => ({
  listIcuStays: jest.fn((req, res) => res.status(200).json({ success: true })),
  getIcuStayById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createIcuStay: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateIcuStay: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteIcuStay: jest.fn((req, res) => res.status(204).send())
}));

const icuStayRoutes = require('@routes/icu-stay/icu-stay.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

describe('ICU Stay Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.mockImplementation(() => (req, res, next) => next());
    validateRequest.mockImplementation(() => (req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use('/api/v1/icu-stays', icuStayRoutes);
  });

  describe('GET /api/v1/icu-stays', () => {
    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/icu-stays');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/icu-stays');
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/icu-stays');
      expect(response.status).toBe(200);
    });

    it('should accept query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/icu-stays')
        .query({ 
          page: 1, 
          limit: 20, 
          admission_id: '123',
          is_active: 'true'
        });
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/icu-stays/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/icu-stays/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/icu-stays/123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/icu-stays', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .post('/api/v1/icu-stays')
        .send({
          admission_id: '123',
          started_at: '2024-01-01T10:00:00.000Z'
        });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/icu-stays')
        .send({
          admission_id: '123',
          started_at: '2024-01-01T10:00:00.000Z'
        });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/icu-stays/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .put('/api/v1/icu-stays/123')
        .send({ ended_at: '2024-01-02T10:00:00.000Z' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app)
        .put('/api/v1/icu-stays/123')
        .send({ ended_at: '2024-01-02T10:00:00.000Z' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/icu-stays/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).delete('/api/v1/icu-stays/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/icu-stays/123');
      expect(response.status).toBe(204);
    });
  });
});
