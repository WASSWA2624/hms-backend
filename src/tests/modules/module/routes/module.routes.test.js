/**
 * Module routes tests
 *
 * @module tests/modules/module/routes
 * Per testing.mdc: Test all route configurations
 */

const express = require('express');
const request = require('supertest');

// Mock middlewares
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123', tenant_id: 'tenant-123' };
    next();
  })
}));

// Mock controller
jest.mock('@controllers/module/module.controller', () => ({
  listModules: jest.fn((req, res) => res.status(200).json({ data: [] })),
  getModuleById: jest.fn((req, res) => res.status(200).json({ data: {} })),
  createModule: jest.fn((req, res) => res.status(201).json({ data: {} })),
  updateModule: jest.fn((req, res) => res.status(200).json({ data: {} })),
  deleteModule: jest.fn((req, res) => res.status(204).send())
}));

const moduleController = require('@controllers/module/module.controller');
const moduleRoutes = require('@routes/module/module.routes');

describe('Module Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/modules', moduleRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/modules', () => {
    it('should call listModules controller', async () => {
      const response = await request(app)
        .get('/api/v1/modules')
        .expect(200);

      expect(moduleController.listModules).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/modules/:id', () => {
    it('should call getModuleById controller', async () => {
      const response = await request(app)
        .get('/api/v1/modules/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(moduleController.getModuleById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/modules', () => {
    it('should call createModule controller', async () => {
      const moduleData = {
        name: 'New Module',
        description: 'New description'
      };

      const response = await request(app)
        .post('/api/v1/modules')
        .send(moduleData)
        .expect(201);

      expect(moduleController.createModule).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/modules/:id', () => {
    it('should call updateModule controller', async () => {
      const updateData = {
        name: 'Updated Module'
      };

      const response = await request(app)
        .put('/api/v1/modules/123e4567-e89b-12d3-a456-426614174000')
        .send(updateData)
        .expect(200);

      expect(moduleController.updateModule).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/modules/:id', () => {
    it('should call deleteModule controller', async () => {
      const response = await request(app)
        .delete('/api/v1/modules/123e4567-e89b-12d3-a456-426614174000')
        .expect(204);

      expect(moduleController.deleteModule).toHaveBeenCalled();
    });
  });
});
