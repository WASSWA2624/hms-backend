/**
 * Webhook subscription routes tests
 *
 * @module tests/modules/webhook-subscription/routes
 * @description Tests for webhook subscription route endpoints
 */

const request = require('supertest');
const express = require('express');
const webhookSubscriptionRoutes = require('@modules/webhook-subscription/routes/webhook-subscription.routes');
const webhookSubscriptionController = require('@controllers/webhook-subscription/webhook-subscription.controller');
const { validate } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('@controllers/webhook-subscription/webhook-subscription.controller');
jest.mock('@middlewares/validate.middleware', () => ({
  validate: jest.fn(() => (req, res, next) => next())
}));
jest.mock('@lib/async', () => ({
  asyncHandler: jest.fn((fn) => fn)
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/webhook-subscriptions', webhookSubscriptionRoutes);

describe('Webhook Subscription Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/webhook-subscriptions', () => {
    it('should call listWebhookSubscriptions controller', async () => {
      webhookSubscriptionController.listWebhookSubscriptions.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app)
        .get('/api/v1/webhook-subscriptions')
        .expect(200);

      expect(webhookSubscriptionController.listWebhookSubscriptions).toHaveBeenCalled();
    });

    it('should accept query parameters', async () => {
      webhookSubscriptionController.listWebhookSubscriptions.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app)
        .get('/api/v1/webhook-subscriptions?page=1&limit=20')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/webhook-subscriptions/:id', () => {
    it('should call getWebhookSubscription controller', async () => {
      webhookSubscriptionController.getWebhookSubscription.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: req.params.id } });
      });

      const webhookId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/v1/webhook-subscriptions/${webhookId}`)
        .expect(200);

      expect(webhookSubscriptionController.getWebhookSubscription).toHaveBeenCalled();
    });

    it('should accept valid UUID parameter', async () => {
      webhookSubscriptionController.getWebhookSubscription.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: req.params.id } });
      });

      const response = await request(app)
        .get('/api/v1/webhook-subscriptions/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
    });
  });

  describe('POST /api/v1/webhook-subscriptions', () => {
    it('should call createWebhookSubscription controller', async () => {
      webhookSubscriptionController.createWebhookSubscription.mockImplementation((req, res) => {
        res.status(201).json({ data: req.body });
      });

      const webhookData = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        event: 'user.created',
        target_url: 'https://example.com/webhook',
        is_active: true
      };

      const response = await request(app)
        .post('/api/v1/webhook-subscriptions')
        .send(webhookData)
        .expect(201);

      expect(webhookSubscriptionController.createWebhookSubscription).toHaveBeenCalled();
    });

    it('should accept valid request body', async () => {
      webhookSubscriptionController.createWebhookSubscription.mockImplementation((req, res) => {
        res.status(201).json({ data: req.body });
      });

      const response = await request(app)
        .post('/api/v1/webhook-subscriptions')
        .send({
          tenant_id: '123e4567-e89b-12d3-a456-426614174000',
          event: 'user.created',
          target_url: 'https://example.com/webhook'
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('event');
    });
  });

  describe('PUT /api/v1/webhook-subscriptions/:id', () => {
    it('should call updateWebhookSubscription controller', async () => {
      webhookSubscriptionController.updateWebhookSubscription.mockImplementation((req, res) => {
        res.status(200).json({ data: { ...req.body, id: req.params.id } });
      });

      const webhookId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { is_active: false };

      const response = await request(app)
        .put(`/api/v1/webhook-subscriptions/${webhookId}`)
        .send(updateData)
        .expect(200);

      expect(webhookSubscriptionController.updateWebhookSubscription).toHaveBeenCalled();
    });

    it('should accept valid request body and parameters', async () => {
      webhookSubscriptionController.updateWebhookSubscription.mockImplementation((req, res) => {
        res.status(200).json({ data: { ...req.body, id: req.params.id } });
      });

      const response = await request(app)
        .put('/api/v1/webhook-subscriptions/123e4567-e89b-12d3-a456-426614174000')
        .send({ is_active: false })
        .expect(200);

      expect(response.body.data).toHaveProperty('is_active');
    });
  });

  describe('DELETE /api/v1/webhook-subscriptions/:id', () => {
    it('should call deleteWebhookSubscription controller', async () => {
      webhookSubscriptionController.deleteWebhookSubscription.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const webhookId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app)
        .delete(`/api/v1/webhook-subscriptions/${webhookId}`)
        .expect(204);

      expect(webhookSubscriptionController.deleteWebhookSubscription).toHaveBeenCalled();
    });

    it('should accept valid UUID for delete', async () => {
      webhookSubscriptionController.deleteWebhookSubscription.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app)
        .delete('/api/v1/webhook-subscriptions/123e4567-e89b-12d3-a456-426614174000')
        .expect(204);

      expect(webhookSubscriptionController.deleteWebhookSubscription).toHaveBeenCalled();
    });
  });
});
