/**
 * Asset service log routes tests
 *
 * @module tests/modules/asset-service-log/routes
 * @description Tests for asset service log API routes
 */

const request = require('supertest');
const express = require('express');
const assetServiceLogRoutes = require('../../../../modules/asset-service-log/routes/asset-service-log.routes');
const assetServiceLogController = require('../../../../modules/asset-service-log/controllers/asset-service-log.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('../../../../modules/asset-service-log/controllers/asset-service-log.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Asset Service Log Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/asset-service-logs', assetServiceLogRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/asset-service-logs', () => {
    it('should call listAssetServiceLogs controller', async () => {
      assetServiceLogController.listAssetServiceLogs.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/api/v1/asset-service-logs');

      expect(response.status).toBe(200);
      expect(assetServiceLogController.listAssetServiceLogs).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/asset-service-logs/:id', () => {
    it('should call getAssetServiceLogById controller', async () => {
      assetServiceLogController.getAssetServiceLogById.mockImplementation((req, res) => {
        res.status(200).json({ id: req.params.id });
      });

      const response = await request(app).get('/api/v1/asset-service-logs/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(200);
      expect(assetServiceLogController.getAssetServiceLogById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/asset-service-logs', () => {
    it('should call createAssetServiceLog controller', async () => {
      assetServiceLogController.createAssetServiceLog.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/api/v1/asset-service-logs')
        .send({ asset_id: '123e4567-e89b-12d3-a456-426614174000' });

      expect(response.status).toBe(201);
      expect(assetServiceLogController.createAssetServiceLog).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/asset-service-logs/:id', () => {
    it('should call updateAssetServiceLog controller', async () => {
      assetServiceLogController.updateAssetServiceLog.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put('/api/v1/asset-service-logs/123e4567-e89b-12d3-a456-426614174000')
        .send({ notes: 'Updated notes' });

      expect(response.status).toBe(200);
      expect(assetServiceLogController.updateAssetServiceLog).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/asset-service-logs/:id', () => {
    it('should call deleteAssetServiceLog controller', async () => {
      assetServiceLogController.deleteAssetServiceLog.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/asset-service-logs/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(204);
      expect(assetServiceLogController.deleteAssetServiceLog).toHaveBeenCalled();
    });
  });
});
