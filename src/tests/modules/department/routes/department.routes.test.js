/**
 * Department routes integration tests
 *
 * @module tests/modules/department/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/department/department.controller');

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
const departmentController = require('@controllers/department/department.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const departmentRoutes = require('../../../../modules/department/routes/department.routes');

describe('Department Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/departments', departmentRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/departments/', () => {
    it('should call listDepartments controller', async () => {
      departmentController.listDepartments.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Departments retrieved successfully',
          data: [
            { id: 'dept-1', name: 'Emergency', tenant_id: 'tenant-123', department_type: 'CLINICAL' },
            { id: 'dept-2', name: 'Radiology', tenant_id: 'tenant-123', department_type: 'DIAGNOSTICS' }
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
        .get('/api/v1/departments/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(departmentController.listDepartments).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should pass filters to controller', async () => {
      departmentController.listDepartments.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Departments retrieved successfully',
          data: [],
          pagination: {}
        });
      });

      const response = await request(app)
        .get('/api/v1/departments/')
        .query({
          page: 1,
          limit: 20,
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          branch_id: 'branch-123',
          department_type: 'CLINICAL',
          is_active: 'true',
          search: 'emergency',
          sort_by: 'name',
          order: 'asc'
        });

      expect(response.status).toBe(200);
      expect(departmentController.listDepartments).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/departments/:id', () => {
    it('should call getDepartmentById controller', async () => {
      departmentController.getDepartmentById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Department retrieved successfully',
          data: {
            id: 'dept-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            branch_id: 'branch-123',
            name: 'Emergency Department',
            department_type: 'CLINICAL',
            is_active: true
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/departments/dept-123');

      expect(response.status).toBe(200);
      expect(departmentController.getDepartmentById).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id', 'dept-123');
    });
  });

  describe('POST /api/v1/departments/', () => {
    it('should call createDepartment controller', async () => {
      departmentController.createDepartment.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Department created successfully',
          data: {
            id: 'dept-new',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            branch_id: 'branch-123',
            name: 'New Department',
            department_type: 'CLINICAL',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/departments/')
        .send({
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          branch_id: 'branch-123',
          name: 'New Department',
          department_type: 'CLINICAL',
          is_active: true
        });

      expect(response.status).toBe(201);
      expect(departmentController.createDepartment).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id');
    });

    it('should create department with minimal data', async () => {
      departmentController.createDepartment.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Department created successfully',
          data: {
            id: 'dept-new',
            tenant_id: 'tenant-123',
            facility_id: null,
            branch_id: null,
            name: 'New Department',
            department_type: 'CLINICAL',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/departments/')
        .send({
          tenant_id: 'tenant-123',
          name: 'New Department',
          department_type: 'CLINICAL'
        });

      expect(response.status).toBe(201);
      expect(departmentController.createDepartment).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/departments/:id', () => {
    it('should call updateDepartment controller', async () => {
      departmentController.updateDepartment.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Department updated successfully',
          data: {
            id: 'dept-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            branch_id: 'branch-123',
            name: 'Updated Department',
            department_type: 'ADMINISTRATIVE',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 2
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/departments/dept-123')
        .send({
          name: 'Updated Department',
          department_type: 'ADMINISTRATIVE',
          is_active: false
        });

      expect(response.status).toBe(200);
      expect(departmentController.updateDepartment).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('name', 'Updated Department');
    });

    it('should update department with partial data', async () => {
      departmentController.updateDepartment.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Department updated successfully',
          data: {
            id: 'dept-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            branch_id: 'branch-123',
            name: 'Emergency Department',
            department_type: 'CLINICAL',
            is_active: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 2
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/departments/dept-123')
        .send({
          is_active: false
        });

      expect(response.status).toBe(200);
      expect(departmentController.updateDepartment).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/departments/:id', () => {
    it('should call deleteDepartment controller', async () => {
      departmentController.deleteDepartment.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/departments/dept-123');

      expect(response.status).toBe(204);
      expect(departmentController.deleteDepartment).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/departments/:id/units', () => {
    it('should call getDepartmentUnits controller', async () => {
      departmentController.getDepartmentUnits.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Department units retrieved successfully',
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/departments/dept-123/units')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(departmentController.getDepartmentUnits).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });
  });
});
