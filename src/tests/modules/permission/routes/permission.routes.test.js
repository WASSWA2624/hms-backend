/**
 * Permission routes tests
 *
 * @module tests/modules/permission/routes
 * Per testing.mdc: Test route definitions and middleware chain
 */

const express = require('express');
const request = require('supertest');

jest.mock('@controllers/permission/permission.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

const permissionController = require('@controllers/permission/permission.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

authenticate.mockImplementation(() => (req, res, next) => {
  req.user = { id: 'user-123' };
  next();
});
validateRequest.mockImplementation(() => (req, res, next) => next());

permissionController.listPermissions = jest.fn((req, res) => res.status(200).json({ permissions: [] }));
permissionController.getPermissionById = jest.fn((req, res) => res.status(200).json({ id: 'permission-123' }));
permissionController.createPermission = jest.fn((req, res) => res.status(201).json({ id: 'permission-123' }));
permissionController.updatePermission = jest.fn((req, res) => res.status(200).json({ id: 'permission-123' }));
permissionController.deletePermission = jest.fn((req, res) => res.status(204).send());

const permissionRoutes = require('@routes/permission/permission.routes');

const app = express();
app.use(express.json());
app.use('/api/v1/permissions', permissionRoutes);

describe('Permission Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/permissions', () => {
    it('should call listPermissions controller', async () => {
      const response = await request(app).get('/api/v1/permissions');

      expect(response.status).toBe(200);
      expect(permissionController.listPermissions).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/permissions');
      expect(authenticate).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/permissions/:id', () => {
    it('should call getPermissionById controller', async () => {
      const response = await request(app).get('/api/v1/permissions/permission-123');

      expect(response.status).toBe(200);
      expect(permissionController.getPermissionById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/permissions', () => {
    it('should call createPermission controller', async () => {
      const response = await request(app)
        .post('/api/v1/permissions')
        .send({ name: 'view_users', tenant_id: 'tenant-123' });

      expect(response.status).toBe(201);
      expect(permissionController.createPermission).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/permissions/:id', () => {
    it('should call updatePermission controller', async () => {
      const response = await request(app)
        .put('/api/v1/permissions/permission-123')
        .send({ name: 'edit_users' });

      expect(response.status).toBe(200);
      expect(permissionController.updatePermission).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/permissions/:id', () => {
    it('should call deletePermission controller', async () => {
      const response = await request(app).delete('/api/v1/permissions/permission-123');

      expect(response.status).toBe(204);
      expect(permissionController.deletePermission).toHaveBeenCalled();
    });
  });
});
