/**
 * Subscription Plan routes tests
 *
 * @module tests/modules/subscription-plan/routes
 * @description Tests for subscription plan route endpoints
 */

const request = require('supertest');
const express = require('express');
const subscriptionPlanRoutes = require('../../../../modules/subscription-plan/routes/subscription-plan.routes');
const subscriptionPlanController = require('../../../../modules/subscription-plan/controllers/subscription-plan.controller');

jest.mock('../../../../modules/subscription-plan/controllers/subscription-plan.controller');
jest.mock('@lib/async', () => ({
  asyncHandler: (fn) => fn
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validate: () => (req, res, next) => next()
}));

const app = express();
app.use(express.json());
app.use('/subscription-plans', subscriptionPlanRoutes);

describe('Subscription Plan Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /subscription-plans', () => {
    it('should call listSubscriptionPlans controller', async () => {
      subscriptionPlanController.listSubscriptionPlans.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/subscription-plans');

      expect(response.status).toBe(200);
      expect(subscriptionPlanController.listSubscriptionPlans).toHaveBeenCalled();
    });
  });

  describe('GET /subscription-plans/:id', () => {
    it('should call getSubscriptionPlan controller', async () => {
      subscriptionPlanController.getSubscriptionPlan.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/subscription-plans/123');

      expect(response.status).toBe(200);
      expect(subscriptionPlanController.getSubscriptionPlan).toHaveBeenCalled();
    });
  });

  describe('POST /subscription-plans', () => {
    it('should call createSubscriptionPlan controller', async () => {
      subscriptionPlanController.createSubscriptionPlan.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/subscription-plans')
        .send({ name: 'Basic Plan', price: 99.99, billing_cycle: 'MONTHLY' });

      expect(response.status).toBe(201);
      expect(subscriptionPlanController.createSubscriptionPlan).toHaveBeenCalled();
    });
  });

  describe('PUT /subscription-plans/:id', () => {
    it('should call updateSubscriptionPlan controller', async () => {
      subscriptionPlanController.updateSubscriptionPlan.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put('/subscription-plans/123')
        .send({ name: 'Updated Plan' });

      expect(response.status).toBe(200);
      expect(subscriptionPlanController.updateSubscriptionPlan).toHaveBeenCalled();
    });
  });

  describe('DELETE /subscription-plans/:id', () => {
    it('should call deleteSubscriptionPlan controller', async () => {
      subscriptionPlanController.deleteSubscriptionPlan.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete('/subscription-plans/123');

      expect(response.status).toBe(204);
      expect(subscriptionPlanController.deleteSubscriptionPlan).toHaveBeenCalled();
    });
  });
});
