/**
 * Pharmacy order routes tests
 *
 * @module tests/modules/pharmacy-order/routes
 * @description Tests for pharmacy order API endpoints
 * Per testing.mdc: Route tests must verify middleware application and endpoint behavior
 */

const express = require('express');
const request = require('supertest');

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => next())
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));
jest.mock('@controllers/pharmacy-order/pharmacy-order.controller', () => ({
  listPharmacyOrders: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPharmacyOrderById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createPharmacyOrder: jest.fn((req, res) => res.status(201).json({ success: true })),
  updatePharmacyOrder: jest.fn((req, res) => res.status(200).json({ success: true })),
  deletePharmacyOrder: jest.fn((req, res) => res.status(204).send())
}));

const pharmacyOrderRoutes = require('@routes/pharmacy-order/pharmacy-order.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

describe('Pharmacy Order Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/v1/pharmacy-orders', pharmacyOrderRoutes);
  });

  describe('GET /api/v1/pharmacy-orders', () => {
    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/pharmacy-orders');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/pharmacy-orders');
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/pharmacy-orders');
      expect(response.status).toBe(200);
    });

    it('should accept query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/pharmacy-orders')
        .query({ 
          page: 1, 
          limit: 20, 
          patient_id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'ORDERED' 
        });
      expect(response.status).toBe(200);
    });

    it('should accept date range filters', async () => {
      const response = await request(app)
        .get('/api/v1/pharmacy-orders')
        .query({ 
          ordered_at_from: '2026-01-01T00:00:00.000Z',
          ordered_at_to: '2026-12-31T23:59:59.999Z'
        });
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/pharmacy-orders/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/pharmacy-orders/550e8400-e29b-41d4-a716-446655440000');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/pharmacy-orders/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/pharmacy-orders', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .post('/api/v1/pharmacy-orders')
        .send({
          patient_id: '550e8400-e29b-41d4-a716-446655440000',
          encounter_id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'ORDERED'
        });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/pharmacy-orders')
        .send({
          patient_id: '550e8400-e29b-41d4-a716-446655440000',
          encounter_id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'ORDERED'
        });
      expect(response.status).toBe(201);
    });

    it('should accept minimal required data', async () => {
      const response = await request(app)
        .post('/api/v1/pharmacy-orders')
        .send({
          patient_id: '550e8400-e29b-41d4-a716-446655440000'
        });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/pharmacy-orders/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .put('/api/v1/pharmacy-orders/550e8400-e29b-41d4-a716-446655440000')
        .send({ status: 'DISPENSED' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app)
        .put('/api/v1/pharmacy-orders/550e8400-e29b-41d4-a716-446655440000')
        .send({ status: 'DISPENSED' });
      expect(response.status).toBe(200);
    });

    it('should accept partial updates', async () => {
      const response = await request(app)
        .put('/api/v1/pharmacy-orders/550e8400-e29b-41d4-a716-446655440000')
        .send({ encounter_id: '550e8400-e29b-41d4-a716-446655440002' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/pharmacy-orders/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).delete('/api/v1/pharmacy-orders/550e8400-e29b-41d4-a716-446655440000');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/pharmacy-orders/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(204);
    });
  });
});
