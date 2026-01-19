/**
 * Asset routes tests
 *
 * @module tests/modules/asset/routes
 * @description Tests for asset API routes
 */

const request = require('supertest');
const express = require('express');
const assetRoutes = require('../../../../modules/asset/routes/asset.routes');
const assetController = require('../../../../modules/asset/controllers/asset.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('../../../../modules/asset/controllers/asset.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Asset Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/assets', assetRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/assets', () => {
    it('should call listAssets controller', async () => {
      assetController.listAssets.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/api/v1/assets');

      expect(response.status).toBe(200);
      expect(assetController.listAssets).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/assets/:id', () => {
    it('should call getAssetById controller', async () => {
      assetController.getAssetById.mockImplementation((req, res) => {
        res.status(200).json({ id: req.params.id });
      });

      const response = await request(app).get('/api/v1/assets/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(200);
      expect(assetController.getAssetById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/assets', () => {
    it('should call createAsset controller', async () => {
      assetController.createAsset.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/api/v1/assets')
        .send({ tenant_id: '123e4567-e89b-12d3-a456-426614174000', name: 'Asset', status: 'OPEN' });

      expect(response.status).toBe(201);
      expect(assetController.createAsset).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/assets/:id', () => {
    it('should call updateAsset controller', async () => {
      assetController.updateAsset.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put('/api/v1/assets/123e4567-e89b-12d3-a456-426614174000')
        .send({ name: 'Updated Asset' });

      expect(response.status).toBe(200);
      expect(assetController.updateAsset).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/assets/:id', () => {
    it('should call deleteAsset controller', async () => {
      assetController.deleteAsset.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/assets/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(204);
      expect(assetController.deleteAsset).toHaveBeenCalled();
    });
  });
});
