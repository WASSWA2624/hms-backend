/**
 * Subscription routes tests
 *
 * @module tests/modules/subscription/routes
 * @description Tests for subscription route endpoints
 */

const request = require('supertest');
const express = require('express');
const subscriptionRoutes = require('../../../../modules/subscription/routes/subscription.routes');
const subscriptionController = require('../../../../modules/subscription/controllers/subscription.controller');

jest.mock('../../../../modules/subscription/controllers/subscription.controller');
jest.mock('@lib/async', () => ({
  asyncHandler: (fn) => fn
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validate: () => (req, res, next) => next()
}));

const app = express();
app.use(express.json());
app.use('/subscriptions', subscriptionRoutes);

describe('Subscription Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /subscriptions', () => {
    it('should call listSubscriptions controller', async () => {
      subscriptionController.listSubscriptions.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/subscriptions');

      expect(response.status).toBe(200);
      expect(subscriptionController.listSubscriptions).toHaveBeenCalled();
    });
  });

  describe('GET /subscriptions/:id', () => {
    it('should call getSubscription controller', async () => {
      subscriptionController.getSubscription.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/subscriptions/123');

      expect(response.status).toBe(200);
      expect(subscriptionController.getSubscription).toHaveBeenCalled();
    });
  });

  describe('POST /subscriptions', () => {
    it('should call createSubscription controller', async () => {
      subscriptionController.createSubscription.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/subscriptions')
        .send({ tenant_id: '456', plan_id: '789' });

      expect(response.status).toBe(201);
      expect(subscriptionController.createSubscription).toHaveBeenCalled();
    });
  });

  describe('POST /subscriptions/:id/cancel', () => {
    it('should call cancelSubscription controller', async () => {
      subscriptionController.cancelSubscription.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).post('/subscriptions/123/cancel');

      expect(response.status).toBe(200);
      expect(subscriptionController.cancelSubscription).toHaveBeenCalled();
    });
  });

  describe('POST /subscriptions/:id/reactivate', () => {
    it('should call reactivateSubscription controller', async () => {
      subscriptionController.reactivateSubscription.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).post('/subscriptions/123/reactivate');

      expect(response.status).toBe(200);
      expect(subscriptionController.reactivateSubscription).toHaveBeenCalled();
    });
  });

  describe('PUT /subscriptions/:id', () => {
    it('should call updateSubscription controller', async () => {
      subscriptionController.updateSubscription.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put('/subscriptions/123')
        .send({ status: 'PAST_DUE' });

      expect(response.status).toBe(200);
      expect(subscriptionController.updateSubscription).toHaveBeenCalled();
    });
  });

  describe('DELETE /subscriptions/:id', () => {
    it('should call deleteSubscription controller', async () => {
      subscriptionController.deleteSubscription.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete('/subscriptions/123');

      expect(response.status).toBe(204);
      expect(subscriptionController.deleteSubscription).toHaveBeenCalled();
    });
  });
});
