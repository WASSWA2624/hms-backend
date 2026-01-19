/**
 * Auth routes integration tests
 *
 * @module tests/modules/auth/routes
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/auth/auth.controller');
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
const authController = require('@controllers/auth/auth.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path since @modules alias doesn't exist
const authRoutes = require('../../../../modules/auth/routes/auth.routes');

describe('Auth Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should call login controller', async () => {
      authController.login.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Login successful',
          data: {
            access_token: 'token',
            refresh_token: 'refresh'
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          tenant_id: 'tenant-123'
        });

      expect(response.status).toBe(200);
      expect(authController.login).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data.access_token');
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should call register controller', async () => {
      authController.register.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Registration successful',
          data: {
            id: 'user-123',
            email: 'newuser@example.com'
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          tenant_id: 'tenant-123'
        });

      expect(response.status).toBe(201);
      expect(authController.register).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('should call verifyEmail controller', async () => {
      authController.verifyEmail.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Email verified successfully'
        });
      });

      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({
          token: 'verification-token'
        });

      expect(response.status).toBe(200);
      expect(authController.verifyEmail).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/verify-phone', () => {
    it('should call verifyPhone controller', async () => {
      authController.verifyPhone.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Phone verified successfully'
        });
      });

      const response = await request(app)
        .post('/api/v1/auth/verify-phone')
        .send({
          token: 'verification-token',
          phone: '+1234567890'
        });

      expect(response.status).toBe(200);
      expect(authController.verifyPhone).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/resend-verification', () => {
    it('should call resendVerification controller', async () => {
      authController.resendVerification.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Verification code sent'
        });
      });

      const response = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({
          email: 'user@example.com',
          type: 'email'
        });

      expect(response.status).toBe(200);
      expect(authController.resendVerification).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should call forgotPassword controller', async () => {
      authController.forgotPassword.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Password reset email sent'
        });
      });

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'user@example.com',
          tenant_id: 'tenant-123'
        });

      expect(response.status).toBe(200);
      expect(authController.forgotPassword).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should call resetPassword controller', async () => {
      authController.resetPassword.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Password reset successful'
        });
      });

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'reset-token',
          new_password: 'NewPassword123!',
          confirm_password: 'NewPassword123!'
        });

      expect(response.status).toBe(200);
      expect(authController.resetPassword).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should call changePassword controller with authentication', async () => {
      authController.changePassword.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Password changed successfully'
        });
      });

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .send({
          old_password: 'OldPassword123!',
          new_password: 'NewPassword123!',
          confirm_password: 'NewPassword123!'
        });

      expect(response.status).toBe(200);
      expect(authController.changePassword).toHaveBeenCalled();
      // User should be attached by authenticate middleware
      expect(authController.changePassword.mock.calls[0][0].user).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should call refresh controller', async () => {
      authController.refresh.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Token refreshed',
          data: {
            access_token: 'new-token',
            refresh_token: 'new-refresh'
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refresh_token: 'refresh-token'
        });

      expect(response.status).toBe(200);
      expect(authController.refresh).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should call logout controller with authentication', async () => {
      authController.logout.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Logout successful'
        });
      });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({
          refresh_token: 'refresh-token'
        });

      expect(response.status).toBe(200);
      expect(authController.logout).toHaveBeenCalled();
      // User should be attached by authenticate middleware
      expect(authController.logout.mock.calls[0][0].user).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should call getMe controller with authentication', async () => {
      authController.getMe.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          data: {
            id: 'user-123',
            email: 'user@example.com'
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/auth/me');

      expect(response.status).toBe(200);
      expect(authController.getMe).toHaveBeenCalled();
      // User should be attached by authenticate middleware
      expect(authController.getMe.mock.calls[0][0].user).toBeDefined();
    });
  });
});
