/**
 * NotificationDelivery routes tests
 *
 * @module tests/modules/notification-delivery/routes
 * @description Tests for notification-delivery route configuration
 * Per testing.mdc: Route tests verify middleware and handler attachment
 */

const express = require('express');
const request = require('supertest');

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@controllers/notification-delivery/notification-delivery.controller', () => ({
  listNotificationDeliveries: jest.fn((req, res) => res.status(200).json({ success: true })),
  getNotificationDeliveryById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createNotificationDelivery: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateNotificationDelivery: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteNotificationDelivery: jest.fn((req, res) => res.status(204).send())
}));

describe('NotificationDelivery Routes', () => {
  let app;
  let notificationDeliveryRoutes;
  let authenticate;
  let validateRequest;

  beforeAll(() => {
    notificationDeliveryRoutes = require('@routes/notification-delivery/notification-delivery.routes');
    const authMock = require('@middlewares/auth.middleware');
    const validateMock = require('@middlewares/validate.middleware');
    authenticate = authMock.authenticate;
    validateRequest = validateMock.validateRequest;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/v1/notification-deliveries', notificationDeliveryRoutes);
  });

  describe('GET /api/v1/notification-deliveries', () => {
    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/notification-deliveries');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/notification-deliveries');
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/notification-deliveries');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/notification-deliveries/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/notification-deliveries/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/notification-deliveries/123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/notification-deliveries', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .post('/api/v1/notification-deliveries')
        .send({ notification_id: '123', channel: 'EMAIL' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/notification-deliveries')
        .send({ notification_id: '123', channel: 'EMAIL' });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/notification-deliveries/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .put('/api/v1/notification-deliveries/123')
        .send({ status: 'sent' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app)
        .put('/api/v1/notification-deliveries/123')
        .send({ status: 'sent' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/notification-deliveries/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).delete('/api/v1/notification-deliveries/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/notification-deliveries/123');
      expect(response.status).toBe(204);
    });
  });
});
