/**
 * User-Role routes tests
 *
 * @module tests/modules/user-role/routes
 * Per testing.mdc: Test route definitions and middleware chain
 */

const express = require('express');
const request = require('supertest');

jest.mock('@controllers/user-role/user-role.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

const userRoleController = require('@controllers/user-role/user-role.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

authenticate.mockImplementation(() => (req, res, next) => {
  req.user = { id: 'user-123' };
  next();
});
validateRequest.mockImplementation(() => (req, res, next) => next());

userRoleController.listUserRoles = jest.fn((req, res) => res.status(200).json({ userRoles: [] }));
userRoleController.getUserRoleById = jest.fn((req, res) => res.status(200).json({ id: 'ur-123' }));
userRoleController.createUserRole = jest.fn((req, res) => res.status(201).json({ id: 'ur-123' }));
userRoleController.updateUserRole = jest.fn((req, res) => res.status(200).json({ id: 'ur-123' }));
userRoleController.deleteUserRole = jest.fn((req, res) => res.status(204).send());

const userRoleRoutes = require('@routes/user-role/user-role.routes');

const app = express();
app.use(express.json());
app.use('/api/v1/user-roles', userRoleRoutes);

describe('User-Role Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/user-roles', () => {
    it('should call listUserRoles controller', async () => {
      const response = await request(app).get('/api/v1/user-roles');

      expect(response.status).toBe(200);
      expect(userRoleController.listUserRoles).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/user-roles/:id', () => {
    it('should call getUserRoleById controller', async () => {
      const response = await request(app).get('/api/v1/user-roles/ur-123');

      expect(response.status).toBe(200);
      expect(userRoleController.getUserRoleById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/user-roles', () => {
    it('should call createUserRole controller', async () => {
      const response = await request(app)
        .post('/api/v1/user-roles')
        .send({ user_id: 'user-123', role_id: 'role-123', tenant_id: 'tenant-123' });

      expect(response.status).toBe(201);
      expect(userRoleController.createUserRole).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/user-roles/:id', () => {
    it('should call updateUserRole controller', async () => {
      const response = await request(app)
        .put('/api/v1/user-roles/ur-123')
        .send({ role_id: 'role-456' });

      expect(response.status).toBe(200);
      expect(userRoleController.updateUserRole).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/user-roles/:id', () => {
    it('should call deleteUserRole controller', async () => {
      const response = await request(app).delete('/api/v1/user-roles/ur-123');

      expect(response.status).toBe(204);
      expect(userRoleController.deleteUserRole).toHaveBeenCalled();
    });
  });
});
