/**
 * Payment routes tests
 */

const request = require('supertest');
const express = require('express');

jest.mock('@controllers/payment/payment.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

const paymentController = require('@controllers/payment/payment.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');
const paymentRoutes = require('@routes/payment/payment.routes');

const app = express();
app.use(express.json());
app.use('/api/v1/payments', paymentRoutes);

describe('Payment Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id', tenant_id: 'tenant-123' };
      next();
    });
    validateRequest.mockImplementation(() => (req, res, next) => next());

    paymentController.listPayments.mockImplementation((req, res) => res.status(200).json({ ok: true }));
    paymentController.getPaymentById.mockImplementation((req, res) => res.status(200).json({ ok: true }));
    paymentController.createPayment.mockImplementation((req, res) => res.status(201).json({ ok: true }));
    paymentController.updatePayment.mockImplementation((req, res) => res.status(200).json({ ok: true }));
    paymentController.deletePayment.mockImplementation((req, res) => res.status(204).send());
  });

  describe('GET /api/v1/payments', () => {
    it('should list payments', async () => {
      const response = await request(app).get('/api/v1/payments');
      expect(response.status).toBe(200);
      expect(paymentController.listPayments).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    it('should get payment by id', async () => {
      const response = await request(app).get('/api/v1/payments/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(200);
      expect(paymentController.getPaymentById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/payments', () => {
    it('should create payment', async () => {
      const response = await request(app)
        .post('/api/v1/payments')
        .send({
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          invoice_id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'PENDING',
          method: 'CASH',
          amount: '100.00'
        });

      expect(response.status).toBe(201);
      expect(paymentController.createPayment).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/payments/:id', () => {
    it('should update payment', async () => {
      const response = await request(app)
        .put('/api/v1/payments/550e8400-e29b-41d4-a716-446655440000')
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(200);
      expect(paymentController.updatePayment).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/payments/:id', () => {
    it('should delete payment', async () => {
      const response = await request(app).delete('/api/v1/payments/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(204);
      expect(paymentController.deletePayment).toHaveBeenCalled();
    });
  });
});

