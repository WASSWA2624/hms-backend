/**
 * Transfer request routes tests
 *
 * @module tests/modules/transfer-request/routes
 * @description Tests for transfer request API endpoints
 * Per testing.mdc: Route tests must verify middleware application and endpoint behavior
 */

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => next())
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));
jest.mock('@controllers/transfer-request/transfer-request.controller', () => ({
  listTransferRequests: jest.fn((req, res) => res.status(200).json({ success: true })),
  getTransferRequestById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createTransferRequest: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateTransferRequest: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteTransferRequest: jest.fn((req, res) => res.status(204).send())
}));

const express = require('express');
const request = require('supertest');
const transferRequestRoutes = require('@routes/transfer-request/transfer-request.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

describe('Transfer Request Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/transfer-requests', transferRequestRoutes);
  });

  describe('GET /api/v1/transfer-requests', () => {
    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/transfer-requests');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/transfer-requests');
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/transfer-requests');
      expect(response.status).toBe(200);
    });

    it('should accept query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/transfer-requests')
        .query({
          page: 1,
          limit: 20,
          admission_id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'REQUESTED',
          search: 'test'
        });
      expect(response.status).toBe(200);
    });

    it('should accept ward filter parameters', async () => {
      const response = await request(app)
        .get('/api/v1/transfer-requests')
        .query({
          from_ward_id: '550e8400-e29b-41d4-a716-446655440001',
          to_ward_id: '550e8400-e29b-41d4-a716-446655440002'
        });
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/transfer-requests/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/transfer-requests/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/transfer-requests/123');
      expect(response.status).toBe(200);
    });

    it('should accept UUID parameter', async () => {
      const response = await request(app).get('/api/v1/transfer-requests/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/transfer-requests', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .post('/api/v1/transfer-requests')
        .send({
          admission_id: '550e8400-e29b-41d4-a716-446655440000',
          from_ward_id: '550e8400-e29b-41d4-a716-446655440001',
          to_ward_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'REQUESTED'
        });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/transfer-requests')
        .send({
          admission_id: '550e8400-e29b-41d4-a716-446655440000',
          from_ward_id: '550e8400-e29b-41d4-a716-446655440001',
          to_ward_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'REQUESTED'
        });
      expect(response.status).toBe(201);
    });

    it('should accept minimal required data', async () => {
      const response = await request(app)
        .post('/api/v1/transfer-requests')
        .send({
          admission_id: '550e8400-e29b-41d4-a716-446655440000'
        });
      expect(response.status).toBe(201);
    });

    it('should accept optional fields', async () => {
      const response = await request(app)
        .post('/api/v1/transfer-requests')
        .send({
          admission_id: '550e8400-e29b-41d4-a716-446655440000',
          from_ward_id: '550e8400-e29b-41d4-a716-446655440001',
          to_ward_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'APPROVED',
          requested_at: '2026-01-19T00:00:00.000Z'
        });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/transfer-requests/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .put('/api/v1/transfer-requests/123')
        .send({ status: 'APPROVED' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app)
        .put('/api/v1/transfer-requests/123')
        .send({ status: 'APPROVED' });
      expect(response.status).toBe(200);
    });

    it('should accept status update', async () => {
      const response = await request(app)
        .put('/api/v1/transfer-requests/550e8400-e29b-41d4-a716-446655440000')
        .send({ status: 'IN_PROGRESS' });
      expect(response.status).toBe(200);
    });

    it('should accept ward updates', async () => {
      const response = await request(app)
        .put('/api/v1/transfer-requests/550e8400-e29b-41d4-a716-446655440000')
        .send({
          from_ward_id: '550e8400-e29b-41d4-a716-446655440001',
          to_ward_id: '550e8400-e29b-41d4-a716-446655440002'
        });
      expect(response.status).toBe(200);
    });

    it('should accept partial updates', async () => {
      const response = await request(app)
        .put('/api/v1/transfer-requests/550e8400-e29b-41d4-a716-446655440000')
        .send({ to_ward_id: '550e8400-e29b-41d4-a716-446655440003' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/transfer-requests/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).delete('/api/v1/transfer-requests/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/transfer-requests/123');
      expect(response.status).toBe(204);
    });

    it('should accept UUID parameter', async () => {
      const response = await request(app).delete('/api/v1/transfer-requests/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(204);
    });
  });
});
