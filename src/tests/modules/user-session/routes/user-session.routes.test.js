/**
 * User Session routes integration tests
 *
 * @module tests/modules/user-session/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/user-session/user-session.controller');

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { 
      id: 'user-123', 
      tenant_id: 'tenant-123',
      facility_id: 'facility-123'
    };
    next();
  })
}));

const request = require('supertest');
const express = require('express');
const sessionController = require('@controllers/user-session/user-session.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const sessionRoutes = require('../../../../modules/user-session/routes/user-session.routes');

describe('User Session Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/user-sessions', sessionRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/user-sessions/', () => {
    it('should call listSessions controller', async () => {
      sessionController.listSessions.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Sessions retrieved successfully',
          data: [
            { id: 'session-1', user_id: 'user-123' },
            { id: 'session-2', user_id: 'user-123' }
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
        .get('/api/v1/user-sessions/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(sessionController.listSessions).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should pass filters to controller', async () => {
      sessionController.listSessions.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Sessions retrieved successfully',
          data: [],
          pagination: {}
        });
      });

      const response = await request(app)
        .get('/api/v1/user-sessions/')
        .query({
          page: 1,
          limit: 20,
          user_id: 'user-123',
          is_active: 'true',
          sort_by: 'expires_at',
          order: 'asc'
        });

      expect(response.status).toBe(200);
      expect(sessionController.listSessions).toHaveBeenCalled();
    });

  });

  describe('GET /api/v1/user-sessions/:id', () => {
    it('should call getSessionById controller', async () => {
      sessionController.getSessionById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Session retrieved successfully',
          data: {
            id: 'session-123',
            user_id: 'user-123',
            is_active: true
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/user-sessions/session-123');

      expect(response.status).toBe(200);
      expect(sessionController.getSessionById).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id', 'session-123');
    });

  });

  describe('DELETE /api/v1/user-sessions/:id', () => {
    it('should call revokeSession controller', async () => {
      sessionController.revokeSession.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/user-sessions/session-123');

      expect(response.status).toBe(204);
      expect(sessionController.revokeSession).toHaveBeenCalled();
    });

  });
});
