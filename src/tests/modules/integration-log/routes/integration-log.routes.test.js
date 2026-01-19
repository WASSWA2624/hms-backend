/**
 * Integration log routes tests
 *
 * @module tests/modules/integration-log/routes
 * @description Tests for integration log route endpoints
 */

const request = require('supertest');
const express = require('express');
const integrationLogRoutes = require('@modules/integration-log/routes/integration-log.routes');
const integrationLogController = require('@controllers/integration-log/integration-log.controller');
const { validate } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('@controllers/integration-log/integration-log.controller');
jest.mock('@middlewares/validate.middleware', () => ({
  validate: jest.fn(() => (req, res, next) => next())
}));
jest.mock('@lib/async', () => ({
  asyncHandler: jest.fn((fn) => fn)
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/integration-logs', integrationLogRoutes);

describe('Integration Log Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/integration-logs', () => {
    it('should call listIntegrationLogs controller', async () => {
      integrationLogController.listIntegrationLogs.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app)
        .get('/api/v1/integration-logs')
        .expect(200);

      expect(integrationLogController.listIntegrationLogs).toHaveBeenCalled();
    });

    it('should accept query parameters', async () => {
      integrationLogController.listIntegrationLogs.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app)
        .get('/api/v1/integration-logs?page=1&limit=20')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/integration-logs/:id', () => {
    it('should call getIntegrationLog controller', async () => {
      integrationLogController.getIntegrationLog.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: req.params.id } });
      });

      const logId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/v1/integration-logs/${logId}`)
        .expect(200);

      expect(integrationLogController.getIntegrationLog).toHaveBeenCalled();
    });

    it('should accept valid UUID parameter', async () => {
      integrationLogController.getIntegrationLog.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: req.params.id } });
      });

      const response = await request(app)
        .get('/api/v1/integration-logs/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
    });
  });

  describe('GET /api/v1/integration-logs/integration/:integrationId', () => {
    it('should call getIntegrationLogsByIntegrationId controller', async () => {
      integrationLogController.getIntegrationLogsByIntegrationId.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const integrationId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/v1/integration-logs/integration/${integrationId}`)
        .expect(200);

      expect(integrationLogController.getIntegrationLogsByIntegrationId).toHaveBeenCalled();
    });

    it('should accept valid integrationId parameter', async () => {
      integrationLogController.getIntegrationLogsByIntegrationId.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app)
        .get('/api/v1/integration-logs/integration/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('should allow query parameters for pagination', async () => {
      integrationLogController.getIntegrationLogsByIntegrationId.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const integrationId = '123e4567-e89b-12d3-a456-426614174000';
      await request(app)
        .get(`/api/v1/integration-logs/integration/${integrationId}?page=2&limit=10`)
        .expect(200);

      expect(integrationLogController.getIntegrationLogsByIntegrationId).toHaveBeenCalled();
    });
  });
});
