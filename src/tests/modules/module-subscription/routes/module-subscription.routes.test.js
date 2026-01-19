/**
 * Module subscription routes tests
 *
 * @module tests/modules/module-subscription/routes
 * Per testing.mdc: Test all route configurations
 */

const express = require('express');
const request = require('supertest');

// Mock middlewares
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123', tenant_id: 'tenant-123' };
    next();
  })
}));

// Mock controller
jest.mock('@controllers/module-subscription/module-subscription.controller', () => ({
  listModuleSubscriptions: jest.fn((req, res) => res.status(200).json({ data: [] })),
  getModuleSubscriptionById: jest.fn((req, res) => res.status(200).json({ data: {} })),
  createModuleSubscription: jest.fn((req, res) => res.status(201).json({ data: {} })),
  updateModuleSubscription: jest.fn((req, res) => res.status(200).json({ data: {} })),
  deleteModuleSubscription: jest.fn((req, res) => res.status(204).send())
}));

const moduleSubscriptionController = require('@controllers/module-subscription/module-subscription.controller');
const moduleSubscriptionRoutes = require('@routes/module-subscription/module-subscription.routes');

describe('Module Subscription Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/module-subscriptions', moduleSubscriptionRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/module-subscriptions', () => {
    it('should call listModuleSubscriptions controller', async () => {
      await request(app)
        .get('/api/v1/module-subscriptions')
        .expect(200);

      expect(moduleSubscriptionController.listModuleSubscriptions).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/module-subscriptions/:id', () => {
    it('should call getModuleSubscriptionById controller', async () => {
      await request(app)
        .get('/api/v1/module-subscriptions/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(moduleSubscriptionController.getModuleSubscriptionById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/module-subscriptions', () => {
    it('should call createModuleSubscription controller', async () => {
      const data = {
        module_id: '123e4567-e89b-12d3-a456-426614174000',
        subscription_id: '123e4567-e89b-12d3-a456-426614174001'
      };

      await request(app)
        .post('/api/v1/module-subscriptions')
        .send(data)
        .expect(201);

      expect(moduleSubscriptionController.createModuleSubscription).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/module-subscriptions/:id', () => {
    it('should call updateModuleSubscription controller', async () => {
      await request(app)
        .put('/api/v1/module-subscriptions/123e4567-e89b-12d3-a456-426614174000')
        .send({ is_active: false })
        .expect(200);

      expect(moduleSubscriptionController.updateModuleSubscription).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/module-subscriptions/:id', () => {
    it('should call deleteModuleSubscription controller', async () => {
      await request(app)
        .delete('/api/v1/module-subscriptions/123e4567-e89b-12d3-a456-426614174000')
        .expect(204);

      expect(moduleSubscriptionController.deleteModuleSubscription).toHaveBeenCalled();
    });
  });
});
