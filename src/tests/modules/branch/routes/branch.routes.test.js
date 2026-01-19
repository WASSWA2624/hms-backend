/**
 * Branch routes integration tests
 *
 * @module tests/modules/branch/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/branch/branch.controller');

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
const branchController = require('@controllers/branch/branch.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const branchRoutes = require('../../../../modules/branch/routes/branch.routes');

describe('Branch Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/branches', branchRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/branches/', () => {
    it('should call listBranches controller', async () => {
      branchController.listBranches.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Branches retrieved successfully',
          data: [
            { id: 'branch-1', name: 'Branch A', tenant_id: 'tenant-123' },
            { id: 'branch-2', name: 'Branch B', tenant_id: 'tenant-123' }
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
        .get('/api/v1/branches/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(branchController.listBranches).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should pass filters to controller', async () => {
      branchController.listBranches.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Branches retrieved successfully',
          data: [],
          pagination: {}
        });
      });

      const response = await request(app)
        .get('/api/v1/branches/')
        .query({
          page: 1,
          limit: 20,
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          is_active: 'true',
          search: 'branch',
          sort_by: 'name',
          order: 'asc'
        });

      expect(response.status).toBe(200);
      expect(branchController.listBranches).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/branches/:id', () => {
    it('should call getBranchById controller', async () => {
      branchController.getBranchById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Branch retrieved successfully',
          data: {
            id: 'branch-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            name: 'Main Branch',
            is_active: true
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/branches/branch-123');

      expect(response.status).toBe(200);
      expect(branchController.getBranchById).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id', 'branch-123');
    });
  });

  describe('POST /api/v1/branches/', () => {
    it('should call createBranch controller', async () => {
      branchController.createBranch.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Branch created successfully',
          data: {
            id: 'branch-new',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            name: 'New Branch',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/branches/')
        .send({
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          name: 'New Branch',
          is_active: true
        });

      expect(response.status).toBe(201);
      expect(branchController.createBranch).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id');
    });

    it('should create branch with minimal data', async () => {
      branchController.createBranch.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Branch created successfully',
          data: {
            id: 'branch-new',
            tenant_id: 'tenant-123',
            facility_id: null,
            name: 'New Branch',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/branches/')
        .send({
          tenant_id: 'tenant-123',
          name: 'New Branch'
        });

      expect(response.status).toBe(201);
      expect(branchController.createBranch).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/branches/:id', () => {
    it('should call updateBranch controller', async () => {
      branchController.updateBranch.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Branch updated successfully',
          data: {
            id: 'branch-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            name: 'Updated Branch',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 2
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/branches/branch-123')
        .send({
          name: 'Updated Branch',
          is_active: false
        });

      expect(response.status).toBe(200);
      expect(branchController.updateBranch).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('name', 'Updated Branch');
    });

    it('should update branch with partial data', async () => {
      branchController.updateBranch.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Branch updated successfully',
          data: {
            id: 'branch-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            name: 'Main Branch',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 2
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/branches/branch-123')
        .send({
          is_active: false
        });

      expect(response.status).toBe(200);
      expect(branchController.updateBranch).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/branches/:id', () => {
    it('should call deleteBranch controller', async () => {
      branchController.deleteBranch.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/branches/branch-123');

      expect(response.status).toBe(204);
      expect(branchController.deleteBranch).toHaveBeenCalled();
    });
  });
});
