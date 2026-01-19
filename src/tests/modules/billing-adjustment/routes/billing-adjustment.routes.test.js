/**
 * Billing Adjustment routes tests
 *
 * @module tests/modules/billing-adjustment/routes
 * @description Integration tests for billing adjustment routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies
jest.mock('@controllers/billing-adjustment/billing-adjustment.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

const billingAdjustmentController = require('@controllers/billing-adjustment/billing-adjustment.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');
const billingAdjustmentRoutes = require('@routes/billing-adjustment/billing-adjustment.routes');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/billing-adjustments', billingAdjustmentRoutes);

describe('Billing Adjustment Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id', tenant_id: 'tenant-123' };
      next();
    });

    validateRequest.mockImplementation(() => (req, res, next) => next());

    billingAdjustmentController.listBillingAdjustments.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    billingAdjustmentController.getBillingAdjustmentById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    billingAdjustmentController.createBillingAdjustment.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    billingAdjustmentController.updateBillingAdjustment.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    billingAdjustmentController.deleteBillingAdjustment.mockImplementation((req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/v1/billing-adjustments', () => {
    it('should list billing adjustments', async () => {
      const response = await request(app).get('/api/v1/billing-adjustments');

      expect(response.status).toBe(200);
      expect(billingAdjustmentController.listBillingAdjustments).toHaveBeenCalled();
    });

    it('should apply authentication and validation middlewares', async () => {
      await request(app).get('/api/v1/billing-adjustments');

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/api/v1/billing-adjustments')
        .query({
          invoice_id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'PAID',
          search: 'discount'
        });

      expect(billingAdjustmentController.listBillingAdjustments).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/billing-adjustments/:id', () => {
    const billingAdjustmentId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get billing adjustment by ID', async () => {
      const response = await request(app).get(`/api/v1/billing-adjustments/${billingAdjustmentId}`);

      expect(response.status).toBe(200);
      expect(billingAdjustmentController.getBillingAdjustmentById).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app).get(`/api/v1/billing-adjustments/${billingAdjustmentId}`);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/billing-adjustments', () => {
    const billingAdjustmentData = {
      invoice_id: '550e8400-e29b-41d4-a716-446655440000',
      amount: 100.50,
      status: 'DRAFT',
      reason: 'Discount applied'
    };

    it('should create billing adjustment', async () => {
      const response = await request(app)
        .post('/api/v1/billing-adjustments')
        .send(billingAdjustmentData);

      expect(response.status).toBe(201);
      expect(billingAdjustmentController.createBillingAdjustment).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app)
        .post('/api/v1/billing-adjustments')
        .send(billingAdjustmentData);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/billing-adjustments/:id', () => {
    const billingAdjustmentId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      amount: 200.75,
      status: 'PAID'
    };

    it('should update billing adjustment', async () => {
      const response = await request(app)
        .put(`/api/v1/billing-adjustments/${billingAdjustmentId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(billingAdjustmentController.updateBillingAdjustment).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app)
        .put(`/api/v1/billing-adjustments/${billingAdjustmentId}`)
        .send(updateData);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/billing-adjustments/:id', () => {
    const billingAdjustmentId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete billing adjustment', async () => {
      const response = await request(app).delete(`/api/v1/billing-adjustments/${billingAdjustmentId}`);

      expect(response.status).toBe(204);
      expect(billingAdjustmentController.deleteBillingAdjustment).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app).delete(`/api/v1/billing-adjustments/${billingAdjustmentId}`);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
