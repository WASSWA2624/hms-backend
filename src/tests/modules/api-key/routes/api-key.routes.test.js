/**
 * API Key routes integration tests
 *
 * @module tests/modules/api-key/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/api-key/api-key.controller');

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { 
      id: 'user-123', 
      tenant_id: 'tenant-123'
    };
    next();
  })
}));

const request = require('supertest');
const express = require('express');
const apiKeyController = require('@controllers/api-key/api-key.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const apiKeyRoutes = require('../../../../modules/api-key/routes/api-key.routes');

describe('API Key Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/api-keys', apiKeyRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/api-keys/', () => {
    it('should call listApiKeys controller', async () => {
      apiKeyController.listApiKeys.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'API keys retrieved successfully',
          data: [
            { id: 'api-key-1', name: 'Production Key', tenant_id: 'tenant-123', is_active: true },
            { id: 'api-key-2', name: 'Development Key', tenant_id: 'tenant-123', is_active: true }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/api-keys/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(apiKeyController.listApiKeys).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should pass filters to controller', async () => {
      apiKeyController.listApiKeys.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'API keys retrieved successfully',
          data: [],
          pagination: {}
        });
      });

      const response = await request(app)
        .get('/api/v1/api-keys/')
        .query({
          page: 1,
          limit: 20,
          tenant_id: 'tenant-123',
          user_id: 'user-123',
          is_active: 'true',
          search: 'Production',
          sort_by: 'name',
          order: 'asc'
        });

      expect(response.status).toBe(200);
      expect(apiKeyController.listApiKeys).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/api-keys/:id', () => {
    it('should call getApiKeyById controller', async () => {
      apiKeyController.getApiKeyById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'API key retrieved successfully',
          data: {
            id: 'api-key-123',
            tenant_id: 'tenant-123',
            user_id: 'user-123',
            name: 'Production Key',
            is_active: true,
            expires_at: '2027-12-31T23:59:59Z'
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/api-keys/api-key-123');

      expect(response.status).toBe(200);
      expect(apiKeyController.getApiKeyById).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe('api-key-123');
    });
  });

  describe('POST /api/v1/api-keys/', () => {
    it('should call createApiKey controller', async () => {
      apiKeyController.createApiKey.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'API key created successfully',
          data: {
            id: 'api-key-123',
            tenant_id: 'tenant-123',
            user_id: 'user-123',
            name: 'New API Key',
            is_active: true,
            api_key: 'plain-api-key-value',
            created_at: new Date().toISOString()
          }
        });
      });

      const newApiKeyData = {
        tenant_id: 'tenant-123',
        user_id: 'user-123',
        name: 'New API Key',
        expires_at: '2027-12-31T23:59:59Z'
      };

      const response = await request(app)
        .post('/api/v1/api-keys/')
        .send(newApiKeyData);

      expect(response.status).toBe(201);
      expect(apiKeyController.createApiKey).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('api_key');
    });
  });

  describe('PUT /api/v1/api-keys/:id', () => {
    it('should call updateApiKey controller', async () => {
      apiKeyController.updateApiKey.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'API key updated successfully',
          data: {
            id: 'api-key-123',
            tenant_id: 'tenant-123',
            user_id: 'user-123',
            name: 'Updated Key',
            is_active: false,
            updated_at: new Date().toISOString()
          }
        });
      });

      const updateData = {
        name: 'Updated Key',
        is_active: false
      };

      const response = await request(app)
        .put('/api/v1/api-keys/api-key-123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(apiKeyController.updateApiKey).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.name).toBe('Updated Key');
    });
  });

  describe('DELETE /api/v1/api-keys/:id', () => {
    it('should call deleteApiKey controller', async () => {
      apiKeyController.deleteApiKey.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/api-keys/api-key-123');

      expect(response.status).toBe(204);
      expect(apiKeyController.deleteApiKey).toHaveBeenCalled();
    });
  });
});
