/**
 * Breach notification routes tests
 *
 * @module tests/modules/breach-notification/routes
 * @description Tests for breach notification route endpoints
 * Per testing.mdc: Comprehensive route tests with middleware validation
 */

// Mock dependencies BEFORE importing routes
jest.mock('@controllers/breach-notification/breach-notification.controller', () => ({
  listBreachNotifications: jest.fn(),
  getBreachNotificationById: jest.fn(),
  createBreachNotification: jest.fn(),
  updateBreachNotification: jest.fn(),
  resolveBreachNotification: jest.fn(),
  deleteBreachNotification: jest.fn()
}));

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123', tenant_id: 'tenant-123' };
    next();
  })
}));

const request = require('supertest');
const express = require('express');
const breachNotificationRoutes = require('@routes/breach-notification/breach-notification.routes');
const breachNotificationController = require('@controllers/breach-notification/breach-notification.controller');

describe('Breach Notification Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/breach-notifications', breachNotificationRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/breach-notifications', () => {
    it('should call listBreachNotifications controller', async () => {
      breachNotificationController.listBreachNotifications.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .get('/api/v1/breach-notifications')
        .expect(200);

      expect(breachNotificationController.listBreachNotifications).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('GET /api/v1/breach-notifications/:id', () => {
    it('should call getBreachNotificationById controller', async () => {
      breachNotificationController.getBreachNotificationById.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .get('/api/v1/breach-notifications/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(breachNotificationController.getBreachNotificationById).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('POST /api/v1/breach-notifications', () => {
    it('should call createBreachNotification controller', async () => {
      breachNotificationController.createBreachNotification.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/api/v1/breach-notifications')
        .send({
          severity: 'HIGH',
          status: 'OPEN',
          description: 'Security breach detected'
        })
        .expect(201);

      expect(breachNotificationController.createBreachNotification).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('PUT /api/v1/breach-notifications/:id', () => {
    it('should call updateBreachNotification controller', async () => {
      breachNotificationController.updateBreachNotification.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put('/api/v1/breach-notifications/550e8400-e29b-41d4-a716-446655440000')
        .send({ status: 'INVESTIGATING' })
        .expect(200);

      expect(breachNotificationController.updateBreachNotification).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('POST /api/v1/breach-notifications/:id/resolve', () => {
    it('should call resolveBreachNotification controller', async () => {
      breachNotificationController.resolveBreachNotification.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/api/v1/breach-notifications/550e8400-e29b-41d4-a716-446655440000/resolve')
        .send({ resolved_at: '2024-01-03T10:00:00Z' })
        .expect(200);

      expect(breachNotificationController.resolveBreachNotification).toHaveBeenCalled();
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('DELETE /api/v1/breach-notifications/:id', () => {
    it('should call deleteBreachNotification controller', async () => {
      breachNotificationController.deleteBreachNotification.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app)
        .delete('/api/v1/breach-notifications/550e8400-e29b-41d4-a716-446655440000')
        .expect(204);

      expect(breachNotificationController.deleteBreachNotification).toHaveBeenCalled();
    });
  });
});
