/**
 * Unit routes integration tests
 *
 * @module tests/modules/unit/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/unit/unit.controller');

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
const unitController = require('@controllers/unit/unit.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const unitRoutes = require('../../../../modules/unit/routes/unit.routes');

describe('Unit Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/units', unitRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/units/', () => {
    it('should call listUnits controller', async () => {
      unitController.listUnits.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Units retrieved successfully',
          data: [
            { id: 'unit-1', name: 'ICU Unit', tenant_id: 'tenant-123' },
            { id: 'unit-2', name: 'Surgery Unit', tenant_id: 'tenant-123' }
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
        .get('/api/v1/units/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(unitController.listUnits).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should pass filters to controller', async () => {
      unitController.listUnits.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Units retrieved successfully',
          data: [],
          pagination: {}
        });
      });

      const response = await request(app)
        .get('/api/v1/units/')
        .query({
          page: 1,
          limit: 20,
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          department_id: 'department-123',
          is_active: 'true',
          search: 'icu',
          sort_by: 'name',
          order: 'asc'
        });

      expect(response.status).toBe(200);
      expect(unitController.listUnits).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/units/:id', () => {
    it('should call getUnitById controller', async () => {
      unitController.getUnitById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Unit retrieved successfully',
          data: {
            id: 'unit-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            department_id: 'department-123',
            name: 'ICU Unit',
            is_active: true
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/units/unit-123');

      expect(response.status).toBe(200);
      expect(unitController.getUnitById).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id', 'unit-123');
    });
  });

  describe('POST /api/v1/units/', () => {
    it('should call createUnit controller', async () => {
      unitController.createUnit.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Unit created successfully',
          data: {
            id: 'unit-new',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            department_id: 'department-123',
            name: 'New Unit',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/units/')
        .send({
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          department_id: 'department-123',
          name: 'New Unit',
          is_active: true
        });

      expect(response.status).toBe(201);
      expect(unitController.createUnit).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id');
    });

    it('should create unit with minimal data', async () => {
      unitController.createUnit.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Unit created successfully',
          data: {
            id: 'unit-new',
            tenant_id: 'tenant-123',
            facility_id: null,
            department_id: null,
            name: 'New Unit',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/units/')
        .send({
          tenant_id: 'tenant-123',
          name: 'New Unit'
        });

      expect(response.status).toBe(201);
      expect(unitController.createUnit).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/units/:id', () => {
    it('should call updateUnit controller', async () => {
      unitController.updateUnit.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Unit updated successfully',
          data: {
            id: 'unit-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            department_id: 'department-123',
            name: 'Updated Unit',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 2
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/units/unit-123')
        .send({
          name: 'Updated Unit',
          is_active: false
        });

      expect(response.status).toBe(200);
      expect(unitController.updateUnit).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('name', 'Updated Unit');
    });

    it('should update unit with partial data', async () => {
      unitController.updateUnit.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Unit updated successfully',
          data: {
            id: 'unit-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            department_id: 'department-123',
            name: 'ICU Unit',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 2
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/units/unit-123')
        .send({
          is_active: false
        });

      expect(response.status).toBe(200);
      expect(unitController.updateUnit).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/units/:id', () => {
    it('should call deleteUnit controller', async () => {
      unitController.deleteUnit.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/units/unit-123');

      expect(response.status).toBe(204);
      expect(unitController.deleteUnit).toHaveBeenCalled();
    });
  });
});
