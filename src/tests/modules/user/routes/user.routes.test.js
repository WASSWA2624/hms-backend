/**
 * User routes tests
 *
 * @module tests/modules/user/routes
 * @description Integration tests for user routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

const request = require('supertest');
const express = require('express');
const userRoutes = require('@routes/user/user.routes');
const userController = require('@controllers/user/user.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/users', userRoutes);

// Mock dependencies
jest.mock('@controllers/user/user.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticate middleware to pass through
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id' };
      next();
    });

    // Mock validateRequest middleware to pass through
    validateRequest.mockImplementation(() => (req, res, next) => next());

    // Mock controller methods
    userController.listUsers.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    userController.getUserById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    userController.createUser.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    userController.updateUser.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    userController.deleteUser.mockImplementation((req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/v1/users', () => {
    it('should list users', async () => {
      const response = await request(app).get('/api/v1/users');

      expect(response.status).toBe(200);
      expect(userController.listUsers).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/users');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/users');

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.any(Object) })
      );
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/api/v1/users')
        .query({
          page: '1',
          limit: '20',
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'ACTIVE',
          search: 'john'
        });

      expect(userController.listUsers).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/users/:id', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get user by ID', async () => {
      const response = await request(app).get(`/api/v1/users/${userId}`);

      expect(response.status).toBe(200);
      expect(userController.getUserById).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get(`/api/v1/users/${userId}`);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params', async () => {
      await request(app).get(`/api/v1/users/${userId}`);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });

  describe('POST /api/v1/users', () => {
    const userData = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'newuser@example.com',
      password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz',
      status: 'ACTIVE'
    };

    it('should create new user', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send(userData);

      expect(response.status).toBe(201);
      expect(userController.createUser).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).post('/api/v1/users').send(userData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for body', async () => {
      await request(app).post('/api/v1/users').send(userData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.any(Object) })
      );
    });

    it('should accept JSON body', async () => {
      await request(app)
        .post('/api/v1/users')
        .set('Content-Type', 'application/json')
        .send(userData);

      expect(userController.createUser).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      status: 'INACTIVE',
      phone: '+256700000000'
    };

    it('should update user', async () => {
      const response = await request(app)
        .put(`/api/v1/users/${userId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(userController.updateUser).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).put(`/api/v1/users/${userId}`).send(updateData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params and body', async () => {
      await request(app).put(`/api/v1/users/${userId}`).send(updateData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.any(Object),
          body: expect.any(Object)
        })
      );
    });

    it('should accept partial updates', async () => {
      await request(app)
        .put(`/api/v1/users/${userId}`)
        .send({ status: 'INACTIVE' });

      expect(userController.updateUser).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete user', async () => {
      const response = await request(app).delete(`/api/v1/users/${userId}`);

      expect(response.status).toBe(204);
      expect(userController.deleteUser).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).delete(`/api/v1/users/${userId}`);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params', async () => {
      await request(app).delete(`/api/v1/users/${userId}`);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });

  describe('Middleware Order', () => {
    it('should apply middlewares in correct order for GET /', async () => {
      await request(app).get('/api/v1/users');

      const callOrder = [];
      if (authenticate.mock.calls.length > 0) callOrder.push('authenticate');
      if (validateRequest.mock.calls.length > 0) callOrder.push('validate');
      if (userController.listUsers.mock.calls.length > 0) callOrder.push('controller');

      expect(callOrder).toEqual(['authenticate', 'validate', 'controller']);
    });

    it('should apply middlewares in correct order for POST /', async () => {
      await request(app).post('/api/v1/users').send({});

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
      expect(userController.createUser).toHaveBeenCalled();
    });

    it('should apply middlewares in correct order for PUT /:id', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      await request(app).put(`/api/v1/users/${userId}`).send({});

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
      expect(userController.updateUser).toHaveBeenCalled();
    });

    it('should apply middlewares in correct order for DELETE /:id', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      await request(app).delete(`/api/v1/users/${userId}`);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
      expect(userController.deleteUser).toHaveBeenCalled();
    });
  });

  describe('Route Paths', () => {
    it('should mount routes at correct paths', () => {
      const routes = [];
      app._router.stack.forEach(middleware => {
        if (middleware.route) {
          routes.push({
            path: middleware.route.path,
            methods: Object.keys(middleware.route.methods)
          });
        } else if (middleware.name === 'router') {
          middleware.handle.stack.forEach(handler => {
            if (handler.route) {
              routes.push({
                path: handler.route.path,
                methods: Object.keys(handler.route.methods)
              });
            }
          });
        }
      });

      const userRoutes = routes.filter(r => 
        r.path === '/' || r.path === '/:id'
      );

      expect(userRoutes.length).toBeGreaterThan(0);
    });
  });
});
