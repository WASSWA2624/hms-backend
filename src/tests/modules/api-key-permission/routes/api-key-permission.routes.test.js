/**
 * API Key Permission routes integration tests
 *
 * @module tests/modules/api-key-permission/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/api-key-permission/api-key-permission.controller');
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
const apiKeyPermissionController = require('@controllers/api-key-permission/api-key-permission.controller');
const apiKeyPermissionRoutes = require('../../../../modules/api-key-permission/routes/api-key-permission.routes');

describe('API Key Permission Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/api-key-permissions', apiKeyPermissionRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/api-key-permissions/', () => {
    it('should call listApiKeyPermissions controller', async () => {
      apiKeyPermissionController.listApiKeyPermissions.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: [], pagination: {} });
      });

      const response = await request(app).get('/api/v1/api-key-permissions/');

      expect(response.status).toBe(200);
      expect(apiKeyPermissionController.listApiKeyPermissions).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/api-key-permissions/:id', () => {
    it('should call getApiKeyPermissionById controller', async () => {
      apiKeyPermissionController.getApiKeyPermissionById.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: { id: 'akp-123' } });
      });

      const response = await request(app).get('/api/v1/api-key-permissions/akp-123');

      expect(response.status).toBe(200);
      expect(apiKeyPermissionController.getApiKeyPermissionById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/api-key-permissions/', () => {
    it('should call createApiKeyPermission controller', async () => {
      apiKeyPermissionController.createApiKeyPermission.mockImplementation((req, res) => {
        res.status(201).json({ status: 201, data: { id: 'akp-123' } });
      });

      const response = await request(app)
        .post('/api/v1/api-key-permissions/')
        .send({ api_key_id: 'api-key-123', permission_id: 'perm-123' });

      expect(response.status).toBe(201);
      expect(apiKeyPermissionController.createApiKeyPermission).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/api-key-permissions/:id', () => {
    it('should call updateApiKeyPermission controller', async () => {
      apiKeyPermissionController.updateApiKeyPermission.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: { id: 'akp-123' } });
      });

      const response = await request(app)
        .put('/api/v1/api-key-permissions/akp-123')
        .send({ permission_id: 'perm-456' });

      expect(response.status).toBe(200);
      expect(apiKeyPermissionController.updateApiKeyPermission).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/api-key-permissions/:id', () => {
    it('should call deleteApiKeyPermission controller', async () => {
      apiKeyPermissionController.deleteApiKeyPermission.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete('/api/v1/api-key-permissions/akp-123');

      expect(response.status).toBe(204);
      expect(apiKeyPermissionController.deleteApiKeyPermission).toHaveBeenCalled();
    });
  });
});
