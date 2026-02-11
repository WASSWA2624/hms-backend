/**
 * Role routes tests
 *
 * @module tests/modules/role/routes
 * Per testing.mdc: Test route definitions and middleware chain
 */

const express = require('express');
const request = require('supertest');

jest.mock('@controllers/role/role.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

const roleController = require('@controllers/role/role.controller');
const { authenticate, requireAuth } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Setup mocks
authenticate.mockImplementation(() => (req, res, next) => {
  req.user = { id: 'user-123' };
  next();
});
requireAuth.mockImplementation(() => (req, res, next) => {
  req.user = { id: 'user-123', roles: ['ADMIN'] };
  next();
});
validateRequest.mockImplementation(() => (req, res, next) => next());

roleController.listRoles = jest.fn((req, res) => res.status(200).json({ roles: [] }));
roleController.getRoleById = jest.fn((req, res) => res.status(200).json({ id: 'role-123' }));
roleController.createRole = jest.fn((req, res) => res.status(201).json({ id: 'role-123' }));
roleController.updateRole = jest.fn((req, res) => res.status(200).json({ id: 'role-123' }));
roleController.deleteRole = jest.fn((req, res) => res.status(204).send());

const roleRoutes = require('@routes/role/role.routes');

const app = express();
app.use(express.json());
app.use('/api/v1/roles', roleRoutes);

describe('Role Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/roles', () => {
    it('should call listRoles controller', async () => {
      const response = await request(app).get('/api/v1/roles');

      expect(response.status).toBe(200);
      expect(roleController.listRoles).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/roles');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/roles');
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/roles/:id', () => {
    it('should call getRoleById controller', async () => {
      const response = await request(app).get('/api/v1/roles/role-123');

      expect(response.status).toBe(200);
      expect(roleController.getRoleById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/roles', () => {
    it('should call createRole controller', async () => {
      const response = await request(app)
        .post('/api/v1/roles')
        .send({ name: 'New Role', tenant_id: 'tenant-123' });

      expect(response.status).toBe(201);
      expect(roleController.createRole).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/roles/:id', () => {
    it('should call updateRole controller', async () => {
      const response = await request(app)
        .put('/api/v1/roles/role-123')
        .send({ name: 'Updated Role' });

      expect(response.status).toBe(200);
      expect(roleController.updateRole).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/roles/:id', () => {
    it('should call deleteRole controller', async () => {
      const response = await request(app).delete('/api/v1/roles/role-123');

      expect(response.status).toBe(204);
      expect(roleController.deleteRole).toHaveBeenCalled();
    });
  });
});
