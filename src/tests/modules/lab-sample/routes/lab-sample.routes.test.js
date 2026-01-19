/**
 * Lab sample routes tests
 *
 * @module tests/modules/lab-sample/routes
 * @description Tests for lab sample API endpoints
 * Per testing.mdc: Route tests must verify middleware application and endpoint behavior
 */

const express = require('express');
const request = require('supertest');
const labSampleRoutes = require('@routes/lab-sample/lab-sample.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');
jest.mock('@controllers/lab-sample/lab-sample.controller', () => ({
  listLabSamples: jest.fn((req, res) => res.status(200).json({ success: true })),
  getLabSampleById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createLabSample: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateLabSample: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteLabSample: jest.fn((req, res) => res.status(204).send())
}));

describe('Lab Sample Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.mockImplementation(() => (req, res, next) => next());
    validateRequest.mockImplementation(() => (req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use('/api/v1/lab-samples', labSampleRoutes);
  });

  describe('GET /api/v1/lab-samples', () => {
    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/lab-samples');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/lab-samples');
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/lab-samples');
      expect(response.status).toBe(200);
    });

    it('should accept query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/lab-samples')
        .query({ page: 1, limit: 20, lab_order_id: '123', status: 'PENDING' });
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/lab-samples/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/lab-samples/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/lab-samples/123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/lab-samples', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .post('/api/v1/lab-samples')
        .send({
          lab_order_id: '456',
          status: 'PENDING',
          collected_at: null,
          received_at: null
        });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/lab-samples')
        .send({
          lab_order_id: '456',
          status: 'PENDING'
        });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/lab-samples/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .put('/api/v1/lab-samples/123')
        .send({ status: 'COLLECTED' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app)
        .put('/api/v1/lab-samples/123')
        .send({ status: 'COLLECTED' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/lab-samples/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).delete('/api/v1/lab-samples/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/lab-samples/123');
      expect(response.status).toBe(204);
    });
  });
});
