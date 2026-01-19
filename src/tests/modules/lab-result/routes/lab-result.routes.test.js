/**
 * Lab result routes tests
 */

const express = require('express');
const request = require('supertest');
const labResultRoutes = require('@routes/lab-result/lab-result.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');
jest.mock('@controllers/lab-result/lab-result.controller', () => ({
  listLabResults: jest.fn((req, res) => res.status(200).json({ success: true })),
  getLabResultById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createLabResult: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateLabResult: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteLabResult: jest.fn((req, res) => res.status(204).send())
}));

describe('Lab Result Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    authenticate.mockImplementation(() => (req, res, next) => next());
    validateRequest.mockImplementation(() => (req, res, next) => next());

    app = express();
    app.use(express.json());
    app.use('/api/v1/lab-results', labResultRoutes);
  });

  describe('GET /api/v1/lab-results', () => {
    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/lab-results');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/lab-results');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/lab-results/:id', () => {
    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/lab-results/123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/lab-results', () => {
    it('should return 201 status', async () => {
      const response = await request(app).post('/api/v1/lab-results').send({
        lab_order_item_id: '456',
        status: 'PENDING'
      });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/lab-results/:id', () => {
    it('should return 200 status', async () => {
      const response = await request(app).put('/api/v1/lab-results/123').send({ status: 'NORMAL' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/lab-results/:id', () => {
    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/lab-results/123');
      expect(response.status).toBe(204);
    });
  });
});
