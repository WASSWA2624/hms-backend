/**
 * Notification routes tests
 *
 * @module tests/modules/notification/routes
 * @description Tests for notification route configuration
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

jest.mock('@controllers/notification/notification.controller', () => ({
  listNotifications: jest.fn((req, res) => res.status(200).json({ success: true })),
  getNotificationById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createNotification: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateNotification: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteNotification: jest.fn((req, res) => res.status(204).send())
}));

describe('Notification Routes', () => {
  let app;
  let notificationRoutes;
  let authenticate;
  let validateRequest;

  beforeAll(() => {
    notificationRoutes = require('@routes/notification/notification.routes');
    const authMock = require('@middlewares/auth.middleware');
    const validateMock = require('@middlewares/validate.middleware');
    authenticate = authMock.authenticate;
    validateRequest = validateMock.validateRequest;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/v1/notifications', notificationRoutes);
  });

  describe('GET /api/v1/notifications', () => {
    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/notifications');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/notifications');
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/notifications');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/notifications/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).get('/api/v1/notifications/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/api/v1/notifications/123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/notifications', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .post('/api/v1/notifications')
        .send({ title: 'Test', message: 'Test message' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 201 status', async () => {
      const response = await request(app)
        .post('/api/v1/notifications')
        .send({ title: 'Test', message: 'Test message' });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/notifications/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app)
        .put('/api/v1/notifications/123')
        .send({ title: 'Updated' });
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app)
        .put('/api/v1/notifications/123')
        .send({ title: 'Updated' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/notifications/:id', () => {
    it('should apply authentication and validation middleware', async () => {
      await request(app).delete('/api/v1/notifications/123');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      const response = await request(app).delete('/api/v1/notifications/123');
      expect(response.status).toBe(204);
    });
  });
});
