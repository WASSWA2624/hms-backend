/**
 * OAuth Account routes integration tests
 *
 * @module tests/modules/oauth-account/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/oauth-account/oauth-account.controller');

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
const oauthAccountController = require('@controllers/oauth-account/oauth-account.controller');

// Import routes using relative path
const oauthAccountRoutes = require('../../../../modules/oauth-account/routes/oauth-account.routes');

describe('OAuth Account Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/oauth-accounts', oauthAccountRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/oauth-accounts/', () => {
    it('should call listOAuthAccounts controller', async () => {
      oauthAccountController.listOAuthAccounts.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'OAuth accounts retrieved successfully',
          data: [
            { id: 'oauth-1', user_id: 'user-123', provider: 'google' },
            { id: 'oauth-2', user_id: 'user-123', provider: 'microsoft' }
          ],
          pagination: { page: 1, limit: 20, total: 2 }
        });
      });

      const response = await request(app)
        .get('/api/v1/oauth-accounts/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(oauthAccountController.listOAuthAccounts).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/oauth-accounts/:id', () => {
    it('should call getOAuthAccountById controller', async () => {
      oauthAccountController.getOAuthAccountById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'OAuth account retrieved successfully',
          data: { id: 'oauth-123', user_id: 'user-123', provider: 'google' }
        });
      });

      const response = await request(app)
        .get('/api/v1/oauth-accounts/oauth-123');

      expect(response.status).toBe(200);
      expect(oauthAccountController.getOAuthAccountById).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/oauth-accounts/user/:userId', () => {
    it('should call getOAuthAccountsByUserId controller', async () => {
      oauthAccountController.getOAuthAccountsByUserId.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'User OAuth accounts retrieved successfully',
          data: [{ id: 'oauth-1', user_id: 'user-123', provider: 'google' }]
        });
      });

      const response = await request(app)
        .get('/api/v1/oauth-accounts/user/user-123');

      expect(response.status).toBe(200);
      expect(oauthAccountController.getOAuthAccountsByUserId).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/oauth-accounts/', () => {
    it('should call createOAuthAccount controller', async () => {
      oauthAccountController.createOAuthAccount.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'OAuth account created successfully',
          data: { id: 'oauth-123', user_id: 'user-123', provider: 'google' }
        });
      });

      const newOAuthAccount = {
        user_id: 'user-123',
        provider: 'google',
        provider_user_id: 'google-123'
      };

      const response = await request(app)
        .post('/api/v1/oauth-accounts/')
        .send(newOAuthAccount);

      expect(response.status).toBe(201);
      expect(oauthAccountController.createOAuthAccount).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/oauth-accounts/:id', () => {
    it('should call updateOAuthAccount controller', async () => {
      oauthAccountController.updateOAuthAccount.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'OAuth account updated successfully',
          data: { id: 'oauth-123', provider: 'microsoft' }
        });
      });

      const updateData = { provider: 'microsoft' };

      const response = await request(app)
        .put('/api/v1/oauth-accounts/oauth-123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(oauthAccountController.updateOAuthAccount).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/oauth-accounts/:id', () => {
    it('should call deleteOAuthAccount controller', async () => {
      oauthAccountController.deleteOAuthAccount.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/oauth-accounts/oauth-123');

      expect(response.status).toBe(204);
      expect(oauthAccountController.deleteOAuthAccount).toHaveBeenCalled();
    });
  });
});
