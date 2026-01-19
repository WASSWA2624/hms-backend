/**
 * Tenant routes integration tests
 *
 * @module tests/modules/tenant/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/tenant/tenant.controller');

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
const tenantController = require('@controllers/tenant/tenant.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const tenantRoutes = require('../../../../modules/tenant/routes/tenant.routes');

describe('Tenant Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/tenants', tenantRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/tenants/', () => {
    it('should call listTenants controller', async () => {
      tenantController.listTenants.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Tenants retrieved successfully',
          data: [
            { id: 'tenant-1', name: 'Hospital A' },
            { id: 'tenant-2', name: 'Hospital B' }
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
        .get('/api/v1/tenants/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(tenantController.listTenants).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should pass filters to controller', async () => {
      tenantController.listTenants.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Tenants retrieved successfully',
          data: [],
          pagination: {}
        });
      });

      const response = await request(app)
        .get('/api/v1/tenants/')
        .query({
          page: 1,
          limit: 20,
          is_active: 'true',
          search: 'hospital',
          sort_by: 'name',
          order: 'asc'
        });

      expect(response.status).toBe(200);
      expect(tenantController.listTenants).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/tenants/:id', () => {
    it('should call getTenantById controller', async () => {
      tenantController.getTenantById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Tenant retrieved successfully',
          data: {
            id: 'tenant-123',
            name: 'Test Hospital',
            slug: 'test-hospital',
            is_active: true
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/tenants/tenant-123');

      expect(response.status).toBe(200);
      expect(tenantController.getTenantById).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id', 'tenant-123');
    });
  });

  describe('POST /api/v1/tenants/', () => {
    it('should call createTenant controller', async () => {
      tenantController.createTenant.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Tenant created successfully',
          data: {
            id: 'tenant-new',
            name: 'New Hospital',
            slug: 'new-hospital',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/tenants/')
        .send({
          name: 'New Hospital',
          slug: 'new-hospital',
          is_active: true
        });

      expect(response.status).toBe(201);
      expect(tenantController.createTenant).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id');
    });

    it('should create tenant with minimal data', async () => {
      tenantController.createTenant.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Tenant created successfully',
          data: {
            id: 'tenant-new',
            name: 'New Hospital',
            slug: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/tenants/')
        .send({
          name: 'New Hospital'
        });

      expect(response.status).toBe(201);
      expect(tenantController.createTenant).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/tenants/:id', () => {
    it('should call updateTenant controller', async () => {
      tenantController.updateTenant.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Tenant updated successfully',
          data: {
            id: 'tenant-123',
            name: 'Updated Hospital',
            slug: 'test-hospital',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 2
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/tenants/tenant-123')
        .send({
          name: 'Updated Hospital',
          is_active: false
        });

      expect(response.status).toBe(200);
      expect(tenantController.updateTenant).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('name', 'Updated Hospital');
    });

    it('should update tenant with partial data', async () => {
      tenantController.updateTenant.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Tenant updated successfully',
          data: {
            id: 'tenant-123',
            name: 'Test Hospital',
            slug: 'test-hospital',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 2
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/tenants/tenant-123')
        .send({
          is_active: false
        });

      expect(response.status).toBe(200);
      expect(tenantController.updateTenant).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/tenants/:id', () => {
    it('should call deleteTenant controller', async () => {
      tenantController.deleteTenant.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/tenants/tenant-123');

      expect(response.status).toBe(204);
      expect(tenantController.deleteTenant).toHaveBeenCalled();
    });
  });
});
