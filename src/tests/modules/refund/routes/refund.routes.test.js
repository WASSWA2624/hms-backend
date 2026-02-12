/**
 * Refund routes tests
 */

const request = require('supertest');
const express = require('express');

jest.mock('@controllers/refund/refund.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

const refundController = require('@controllers/refund/refund.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');
const refundRoutes = require('@routes/refund/refund.routes');

const app = express();
app.use(express.json());
app.use('/api/v1/refunds', refundRoutes);

describe('Refund Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id', tenant_id: 'tenant-123' };
      next();
    });
    validateRequest.mockImplementation(() => (req, res, next) => next());

    refundController.listRefunds.mockImplementation((req, res) => res.status(200).json({ ok: true }));
    refundController.getRefundById.mockImplementation((req, res) => res.status(200).json({ ok: true }));
    refundController.createRefund.mockImplementation((req, res) => res.status(201).json({ ok: true }));
    refundController.updateRefund.mockImplementation((req, res) => res.status(200).json({ ok: true }));
    refundController.deleteRefund.mockImplementation((req, res) => res.status(204).send());
  });

  describe('GET /api/v1/refunds', () => {
    it('should list refunds', async () => {
      const response = await request(app).get('/api/v1/refunds');
      expect(response.status).toBe(200);
      expect(refundController.listRefunds).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/refunds/:id', () => {
    it('should get refund by id', async () => {
      const response = await request(app).get('/api/v1/refunds/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(200);
      expect(refundController.getRefundById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/refunds', () => {
    it('should create refund', async () => {
      const response = await request(app)
        .post('/api/v1/refunds')
        .send({
          payment_id: '550e8400-e29b-41d4-a716-446655440000',
          amount: '5.00'
        });

      expect(response.status).toBe(201);
      expect(refundController.createRefund).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/refunds/:id', () => {
    it('should update refund', async () => {
      const response = await request(app)
        .put('/api/v1/refunds/550e8400-e29b-41d4-a716-446655440000')
        .send({ reason: 'Updated' });

      expect(response.status).toBe(200);
      expect(refundController.updateRefund).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/refunds/:id', () => {
    it('should delete refund', async () => {
      const response = await request(app).delete('/api/v1/refunds/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(204);
      expect(refundController.deleteRefund).toHaveBeenCalled();
    });
  });
});

