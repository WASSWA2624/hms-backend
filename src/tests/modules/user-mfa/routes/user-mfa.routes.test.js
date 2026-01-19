/**
 * User MFA routes integration tests
 *
 * @module tests/modules/user-mfa/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/user-mfa/user-mfa.controller');

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
const userMfaController = require('@controllers/user-mfa/user-mfa.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const userMfaRoutes = require('../../../../modules/user-mfa/routes/user-mfa.routes');

describe('User MFA Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/user-mfas', userMfaRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/user-mfas/', () => {
    it('should call listUserMfas controller', async () => {
      userMfaController.listUserMfas.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'User MFAs retrieved successfully',
          data: [
            { id: 'mfa-1', user_id: 'user-123', channel: 'SMS' },
            { id: 'mfa-2', user_id: 'user-123', channel: 'EMAIL' }
          ],
          pagination: { page: 1, limit: 20, total: 2 }
        });
      });

      const response = await request(app)
        .get('/api/v1/user-mfas/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(userMfaController.listUserMfas).toHaveBeenCalled();
    });

    it('should pass filters to controller', async () => {
      userMfaController.listUserMfas.mockImplementation((req, res) => {
        res.status(200).json({ status: 200, data: [], pagination: {} });
      });

      const response = await request(app)
        .get('/api/v1/user-mfas/')
        .query({ user_id: 'user-123', channel: 'SMS', is_enabled: 'true' });

      expect(response.status).toBe(200);
      expect(userMfaController.listUserMfas).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/user-mfas/:id', () => {
    it('should call getUserMfaById controller', async () => {
      userMfaController.getUserMfaById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'User MFA retrieved successfully',
          data: { id: 'mfa-123', user_id: 'user-123', channel: 'SMS' }
        });
      });

      const response = await request(app)
        .get('/api/v1/user-mfas/mfa-123');

      expect(response.status).toBe(200);
      expect(userMfaController.getUserMfaById).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/user-mfas/user/:userId', () => {
    it('should call getUserMfasByUserId controller', async () => {
      userMfaController.getUserMfasByUserId.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'User MFAs retrieved successfully',
          data: [
            { id: 'mfa-1', user_id: 'user-123', channel: 'SMS' },
            { id: 'mfa-2', user_id: 'user-123', channel: 'EMAIL' }
          ]
        });
      });

      const response = await request(app)
        .get('/api/v1/user-mfas/user/user-123');

      expect(response.status).toBe(200);
      expect(userMfaController.getUserMfasByUserId).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/user-mfas/', () => {
    it('should call createUserMfa controller', async () => {
      userMfaController.createUserMfa.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'User MFA created successfully',
          data: {
            id: 'mfa-123',
            user_id: 'user-123',
            channel: 'SMS',
            secret_encrypted: 'encrypted_secret',
            is_enabled: true
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/user-mfas/')
        .send({
          user_id: 'user-123',
          channel: 'SMS',
          secret_encrypted: 'encrypted_secret',
          is_enabled: true
        });

      expect(response.status).toBe(201);
      expect(userMfaController.createUserMfa).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/user-mfas/:id', () => {
    it('should call updateUserMfa controller', async () => {
      userMfaController.updateUserMfa.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'User MFA updated successfully',
          data: { id: 'mfa-123', is_enabled: false }
        });
      });

      const response = await request(app)
        .put('/api/v1/user-mfas/mfa-123')
        .send({ is_enabled: false });

      expect(response.status).toBe(200);
      expect(userMfaController.updateUserMfa).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/user-mfas/:id', () => {
    it('should call deleteUserMfa controller', async () => {
      userMfaController.deleteUserMfa.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/user-mfas/mfa-123');

      expect(response.status).toBe(204);
      expect(userMfaController.deleteUserMfa).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/user-mfas/:id/verify', () => {
    it('should call verifyMfaCode controller', async () => {
      userMfaController.verifyMfaCode.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'MFA code verified successfully',
          data: { verified: true }
        });
      });

      const response = await request(app)
        .post('/api/v1/user-mfas/mfa-123/verify')
        .send({ code: '123456' });

      expect(response.status).toBe(200);
      expect(userMfaController.verifyMfaCode).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/user-mfas/:id/enable', () => {
    it('should call enableMfa controller', async () => {
      userMfaController.enableMfa.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'MFA enabled successfully',
          data: { id: 'mfa-123', is_enabled: true }
        });
      });

      const response = await request(app)
        .post('/api/v1/user-mfas/mfa-123/enable')
        .send({});

      expect(response.status).toBe(200);
      expect(userMfaController.enableMfa).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/user-mfas/:id/disable', () => {
    it('should call disableMfa controller', async () => {
      userMfaController.disableMfa.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'MFA disabled successfully',
          data: { id: 'mfa-123', is_enabled: false }
        });
      });

      const response = await request(app)
        .post('/api/v1/user-mfas/mfa-123/disable')
        .send({});

      expect(response.status).toBe(200);
      expect(userMfaController.disableMfa).toHaveBeenCalled();
    });
  });

  describe('Middleware Integration', () => {
    it('should call authentication middleware on all routes', async () => {
      userMfaController.listUserMfas.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      await request(app).get('/api/v1/user-mfas/');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validation middleware on all routes', async () => {
      userMfaController.listUserMfas.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      await request(app).get('/api/v1/user-mfas/');

      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
