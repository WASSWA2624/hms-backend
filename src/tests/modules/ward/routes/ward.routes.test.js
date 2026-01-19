/**
 * Ward routes integration tests
 *
 * @module tests/modules/ward/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/ward/ward.controller');

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
const wardController = require('@controllers/ward/ward.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const wardRoutes = require('../../../../modules/ward/routes/ward.routes');

describe('Ward Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/wards', wardRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/wards/', () => {
    it('should call listWards controller', async () => {
      wardController.listWards.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Wards retrieved successfully',
          data: [
            { id: 'ward-1', name: 'ICU Ward', tenant_id: 'tenant-123', ward_type: 'ICU' },
            { id: 'ward-2', name: 'General Ward', tenant_id: 'tenant-123', ward_type: 'GENERAL' }
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
        .get('/api/v1/wards/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(wardController.listWards).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should pass filters to controller', async () => {
      wardController.listWards.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Wards retrieved successfully',
          data: [],
          pagination: {}
        });
      });

      const response = await request(app)
        .get('/api/v1/wards/')
        .query({
          page: 1,
          limit: 20,
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          department_id: 'department-123',
          ward_type: 'ICU',
          is_active: 'true',
          search: 'icu',
          sort_by: 'name',
          order: 'asc'
        });

      expect(response.status).toBe(200);
      expect(wardController.listWards).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/wards/:id', () => {
    it('should call getWardById controller', async () => {
      wardController.getWardById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Ward retrieved successfully',
          data: {
            id: 'ward-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            department_id: 'department-123',
            name: 'ICU Ward',
            ward_type: 'ICU',
            is_active: true
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/wards/ward-123');

      expect(response.status).toBe(200);
      expect(wardController.getWardById).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id', 'ward-123');
    });
  });

  describe('POST /api/v1/wards/', () => {
    it('should call createWard controller', async () => {
      wardController.createWard.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Ward created successfully',
          data: {
            id: 'ward-new',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            department_id: 'department-123',
            name: 'New Ward',
            ward_type: 'GENERAL',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/wards/')
        .send({
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          department_id: 'department-123',
          name: 'New Ward',
          ward_type: 'GENERAL',
          is_active: true
        });

      expect(response.status).toBe(201);
      expect(wardController.createWard).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id');
    });

    it('should create ward with minimal data', async () => {
      wardController.createWard.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Ward created successfully',
          data: {
            id: 'ward-new',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            department_id: null,
            name: 'New Ward',
            ward_type: 'GENERAL',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/wards/')
        .send({
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          name: 'New Ward',
          ward_type: 'GENERAL'
        });

      expect(response.status).toBe(201);
      expect(wardController.createWard).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/wards/:id', () => {
    it('should call updateWard controller', async () => {
      wardController.updateWard.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Ward updated successfully',
          data: {
            id: 'ward-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            department_id: 'department-123',
            name: 'Updated Ward',
            ward_type: 'SURGICAL',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 2
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/wards/ward-123')
        .send({
          name: 'Updated Ward',
          ward_type: 'SURGICAL',
          is_active: false
        });

      expect(response.status).toBe(200);
      expect(wardController.updateWard).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('name', 'Updated Ward');
    });

    it('should update ward with partial data', async () => {
      wardController.updateWard.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Ward updated successfully',
          data: {
            id: 'ward-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            department_id: 'department-123',
            name: 'ICU Ward',
            ward_type: 'ICU',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 2
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/wards/ward-123')
        .send({
          is_active: false
        });

      expect(response.status).toBe(200);
      expect(wardController.updateWard).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/wards/:id', () => {
    it('should call deleteWard controller', async () => {
      wardController.deleteWard.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/wards/ward-123');

      expect(response.status).toBe(204);
      expect(wardController.deleteWard).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/wards/:id/beds', () => {
    it('should call getWardBeds controller', async () => {
      wardController.getWardBeds.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Ward beds retrieved successfully',
          data: {
            id: 'ward-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            name: 'ICU Ward',
            ward_type: 'ICU',
            is_active: true
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/wards/ward-123/beds');

      expect(response.status).toBe(200);
      expect(wardController.getWardBeds).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id', 'ward-123');
    });
  });
});
