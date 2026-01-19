/**
 * Radiology Order routes tests
 *
 * @module tests/modules/radiology-order/routes
 * @description Integration tests for radiology order routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

// Mock dependencies
jest.mock('@controllers/radiology-order/radiology-order.controller', () => ({
  listRadiologyOrders: jest.fn(),
  getRadiologyOrderById: jest.fn(),
  createRadiologyOrder: jest.fn(),
  updateRadiologyOrder: jest.fn(),
  deleteRadiologyOrder: jest.fn()
}));
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => next())
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

const request = require('supertest');
const express = require('express');
const radiologyOrderRoutes = require('@routes/radiology-order/radiology-order.routes');
const radiologyOrderController = require('@controllers/radiology-order/radiology-order.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/radiology-orders', radiologyOrderRoutes);

describe('Radiology Order Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticate middleware to pass through
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id' };
      next();
    });

    // Mock validateRequest middleware to pass through
    validateRequest.mockImplementation(() => (req, res, next) => next());

    // Mock controller methods
    radiologyOrderController.listRadiologyOrders.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    radiologyOrderController.getRadiologyOrderById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    radiologyOrderController.createRadiologyOrder.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    radiologyOrderController.updateRadiologyOrder.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    radiologyOrderController.deleteRadiologyOrder.mockImplementation((req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/v1/radiology-orders', () => {
    it('should list radiology orders', async () => {
      const response = await request(app).get('/api/v1/radiology-orders');

      expect(response.status).toBe(200);
      expect(radiologyOrderController.listRadiologyOrders).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/radiology-orders');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/radiology-orders');

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.any(Object) })
      );
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/api/v1/radiology-orders')
        .query({
          page: '1',
          limit: '20',
          encounter_id: '550e8400-e29b-41d4-a716-446655440000',
          patient_id: '550e8400-e29b-41d4-a716-446655440001',
          radiology_test_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'ORDERED',
          search: 'CT scan'
        });

      expect(radiologyOrderController.listRadiologyOrders).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/radiology-orders/:id', () => {
    const radiologyOrderId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get radiology order by ID', async () => {
      const response = await request(app).get(`/api/v1/radiology-orders/${radiologyOrderId}`);

      expect(response.status).toBe(200);
      expect(radiologyOrderController.getRadiologyOrderById).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get(`/api/v1/radiology-orders/${radiologyOrderId}`);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params', async () => {
      await request(app).get(`/api/v1/radiology-orders/${radiologyOrderId}`);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });

  describe('POST /api/v1/radiology-orders', () => {
    const radiologyOrderData = {
      patient_id: '550e8400-e29b-41d4-a716-446655440000',
      radiology_test_id: '550e8400-e29b-41d4-a716-446655440001',
      status: 'ORDERED',
      ordered_at: '2026-01-19T09:00:00.000Z'
    };

    it('should create new radiology order', async () => {
      const response = await request(app)
        .post('/api/v1/radiology-orders')
        .send(radiologyOrderData);

      expect(response.status).toBe(201);
      expect(radiologyOrderController.createRadiologyOrder).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).post('/api/v1/radiology-orders').send(radiologyOrderData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for body', async () => {
      await request(app).post('/api/v1/radiology-orders').send(radiologyOrderData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.any(Object) })
      );
    });
  });

  describe('PUT /api/v1/radiology-orders/:id', () => {
    const radiologyOrderId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      status: 'COMPLETED'
    };

    it('should update radiology order', async () => {
      const response = await request(app)
        .put(`/api/v1/radiology-orders/${radiologyOrderId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(radiologyOrderController.updateRadiologyOrder).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).put(`/api/v1/radiology-orders/${radiologyOrderId}`).send(updateData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params and body', async () => {
      await request(app).put(`/api/v1/radiology-orders/${radiologyOrderId}`).send(updateData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.any(Object),
          body: expect.any(Object)
        })
      );
    });
  });

  describe('DELETE /api/v1/radiology-orders/:id', () => {
    const radiologyOrderId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete radiology order', async () => {
      const response = await request(app).delete(`/api/v1/radiology-orders/${radiologyOrderId}`);

      expect(response.status).toBe(204);
      expect(radiologyOrderController.deleteRadiologyOrder).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).delete(`/api/v1/radiology-orders/${radiologyOrderId}`);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params', async () => {
      await request(app).delete(`/api/v1/radiology-orders/${radiologyOrderId}`);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });

  describe('Middleware ordering', () => {
    it('should apply authentication before validation', async () => {
      const callOrder = [];
      
      authenticate.mockImplementation(() => (req, res, next) => {
        callOrder.push('auth');
        req.user = { id: 'test-user-id' };
        next();
      });

      validateRequest.mockImplementation(() => (req, res, next) => {
        callOrder.push('validate');
        next();
      });

      await request(app).get('/api/v1/radiology-orders');

      expect(callOrder).toEqual(['auth', 'validate']);
    });

    it('should apply authentication before controller', async () => {
      const callOrder = [];
      
      authenticate.mockImplementation(() => (req, res, next) => {
        callOrder.push('auth');
        req.user = { id: 'test-user-id' };
        next();
      });

      radiologyOrderController.listRadiologyOrders.mockImplementation((req, res) => {
        callOrder.push('controller');
        res.status(200).json({ success: true });
      });

      await request(app).get('/api/v1/radiology-orders');

      expect(callOrder.indexOf('auth')).toBeLessThan(callOrder.indexOf('controller'));
    });
  });

  describe('HTTP methods', () => {
    it('should not allow POST on /:id endpoint', async () => {
      const radiologyOrderId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app).post(`/api/v1/radiology-orders/${radiologyOrderId}`);

      expect(response.status).toBe(404);
    });

    it('should not allow PATCH on / endpoint', async () => {
      const response = await request(app).patch('/api/v1/radiology-orders');

      expect(response.status).toBe(404);
    });

    it('should not allow PUT on / endpoint', async () => {
      const response = await request(app).put('/api/v1/radiology-orders');

      expect(response.status).toBe(404);
    });
  });
});
