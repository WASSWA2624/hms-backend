/**
 * Role-Permission routes tests
 *
 * @module tests/modules/role-permission/routes
 * Per testing.mdc: Test route definitions and middleware chain
 */

const express = require('express');
const request = require('supertest');

jest.mock('@controllers/role-permission/role-permission.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

const rolePermissionController = require('@controllers/role-permission/role-permission.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

authenticate.mockImplementation(() => (req, res, next) => {
  req.user = { id: 'user-123' };
  next();
});
validateRequest.mockImplementation(() => (req, res, next) => next());

rolePermissionController.listRolePermissions = jest.fn((req, res) => res.status(200).json({ rolePermissions: [] }));
rolePermissionController.getRolePermissionById = jest.fn((req, res) => res.status(200).json({ id: 'rp-123' }));
rolePermissionController.createRolePermission = jest.fn((req, res) => res.status(201).json({ id: 'rp-123' }));
rolePermissionController.updateRolePermission = jest.fn((req, res) => res.status(200).json({ id: 'rp-123' }));
rolePermissionController.deleteRolePermission = jest.fn((req, res) => res.status(204).send());

const rolePermissionRoutes = require('@routes/role-permission/role-permission.routes');

const app = express();
app.use(express.json());
app.use('/api/v1/role-permissions', rolePermissionRoutes);

describe('Role-Permission Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/role-permissions', () => {
    it('should call listRolePermissions controller', async () => {
      const response = await request(app).get('/api/v1/role-permissions');

      expect(response.status).toBe(200);
      expect(rolePermissionController.listRolePermissions).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/role-permissions/:id', () => {
    it('should call getRolePermissionById controller', async () => {
      const response = await request(app).get('/api/v1/role-permissions/rp-123');

      expect(response.status).toBe(200);
      expect(rolePermissionController.getRolePermissionById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/role-permissions', () => {
    it('should call createRolePermission controller', async () => {
      const response = await request(app)
        .post('/api/v1/role-permissions')
        .send({ role_id: 'role-123', permission_id: 'permission-123' });

      expect(response.status).toBe(201);
      expect(rolePermissionController.createRolePermission).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/role-permissions/:id', () => {
    it('should call updateRolePermission controller', async () => {
      const response = await request(app)
        .put('/api/v1/role-permissions/rp-123')
        .send({ role_id: 'role-456' });

      expect(response.status).toBe(200);
      expect(rolePermissionController.updateRolePermission).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/role-permissions/:id', () => {
    it('should call deleteRolePermission controller', async () => {
      const response = await request(app).delete('/api/v1/role-permissions/rp-123');

      expect(response.status).toBe(204);
      expect(rolePermissionController.deleteRolePermission).toHaveBeenCalled();
    });
  });
});
