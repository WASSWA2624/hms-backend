/**
 * Analytics event routes tests
 *
 * @module tests/modules/analytics-event/routes
 * @description Tests for analytics event routes configuration
 * Per testing.mdc: Comprehensive route tests required
 */

const express = require('express');
const request = require('supertest');
const analyticsEventRoutes = require('../../../modules/analytics-event/routes/analytics-event.routes');
const analyticsEventController = require('../../../modules/analytics-event/controllers/analytics-event.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

jest.mock('../../../modules/analytics-event/controllers/analytics-event.controller');
jest.mock('@middlewares/validate.middleware');
jest.mock('@middlewares/auth.middleware');

describe('Analytics Event Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/analytics-events', analyticsEventRoutes);
    authenticate.mockImplementation(() => (req, res, next) => { req.user = { id: 'user-id-123' }; next(); });
    validateRequest.mockImplementation(() => (req, res, next) => next());
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /analytics-events', () => {
    it('should call listAnalyticsEvents controller', async () => {
      analyticsEventController.listAnalyticsEvents.mockImplementation((req, res) => res.status(200).json({ data: [] }));
      await request(app).get('/analytics-events');
      expect(analyticsEventController.listAnalyticsEvents).toHaveBeenCalled();
    });
  });

  describe('GET /analytics-events/:id', () => {
    it('should call getAnalyticsEventById controller', async () => {
      analyticsEventController.getAnalyticsEventById.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).get('/analytics-events/test-id');
      expect(analyticsEventController.getAnalyticsEventById).toHaveBeenCalled();
    });
  });

  describe('POST /analytics-events', () => {
    it('should call createAnalyticsEvent controller', async () => {
      analyticsEventController.createAnalyticsEvent.mockImplementation((req, res) => res.status(201).json({ data: {} }));
      await request(app).post('/analytics-events').send({});
      expect(analyticsEventController.createAnalyticsEvent).toHaveBeenCalled();
    });
  });

  describe('PUT /analytics-events/:id', () => {
    it('should call updateAnalyticsEvent controller', async () => {
      analyticsEventController.updateAnalyticsEvent.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).put('/analytics-events/test-id').send({});
      expect(analyticsEventController.updateAnalyticsEvent).toHaveBeenCalled();
    });
  });

  describe('DELETE /analytics-events/:id', () => {
    it('should call deleteAnalyticsEvent controller', async () => {
      analyticsEventController.deleteAnalyticsEvent.mockImplementation((req, res) => res.status(204).send());
      await request(app).delete('/analytics-events/test-id');
      expect(analyticsEventController.deleteAnalyticsEvent).toHaveBeenCalled();
    });
  });
});
