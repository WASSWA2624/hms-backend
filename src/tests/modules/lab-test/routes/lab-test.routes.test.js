/**
 * Lab test routes tests
 *
 * @module tests/modules/lab-test/routes
 * @description Tests for lab test routes
 * Per testing.mdc: All routes must be tested
 */

const request = require('supertest');
const express = require('express');
const labTestRoutes = require('@routes/lab-test/lab-test.routes');
const labTestController = require('@controllers/lab-test/lab-test.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/lab-tests', labTestRoutes);

// Mock error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    status: err.status || 500,
    message: err.message,
    data: null,
    errors: err.errors || []
  });
});

// Mock dependencies
jest.mock('@controllers/lab-test/lab-test.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

describe('Lab Test Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticate middleware to pass through
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: '123e4567-e89b-12d3-a456-426614174000' };
      next();
    });

    // Mock validateRequest middleware to pass through
    validateRequest.mockImplementation(() => (req, res, next) => next());
  });

  describe('GET /api/v1/lab-tests', () => {
    it('should call listLabTests controller', async () => {
      labTestController.listLabTests.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Lab tests retrieved successfully',
          data: [],
          meta: { locale: 'en', direction: 'ltr' },
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
        .get('/api/v1/lab-tests')
        .expect(200);

      expect(labTestController.listLabTests).toHaveBeenCalled();
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should accept valid query parameters', async () => {
      labTestController.listLabTests.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Lab tests retrieved successfully',
          data: [],
          meta: { locale: 'en', direction: 'ltr' },
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

      await request(app)
        .get('/api/v1/lab-tests')
        .query({
          tenant_id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Blood',
          code: 'CBC',
          page: 1,
          limit: 20
        })
        .expect(200);

      expect(labTestController.listLabTests).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/lab-tests/:id', () => {
    it('should call getLabTestById controller with valid UUID', async () => {
      labTestController.getLabTestById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Lab test retrieved successfully',
          data: { id: req.params.id, name: 'Complete Blood Count' },
          meta: { locale: 'en', direction: 'ltr' }
        });
      });

      const response = await request(app)
        .get('/api/v1/lab-tests/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(labTestController.getLabTestById).toHaveBeenCalled();
      expect(response.body.data.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should reject invalid UUID', async () => {
      await request(app)
        .get('/api/v1/lab-tests/invalid-uuid')
        .expect(400);

      expect(labTestController.getLabTestById).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/lab-tests', () => {
    it('should call createLabTest controller with valid data', async () => {
      labTestController.createLabTest.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Lab test created successfully',
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            ...req.body
          },
          meta: { locale: 'en', direction: 'ltr' }
        });
      });

      const newLabTest = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Complete Blood Count',
        code: 'CBC',
        unit: 'cells/mcL',
        reference_range: '4,500-11,000'
      };

      const response = await request(app)
        .post('/api/v1/lab-tests')
        .send(newLabTest)
        .expect(201);

      expect(labTestController.createLabTest).toHaveBeenCalled();
      expect(response.body.data.name).toBe(newLabTest.name);
    });

    it('should reject invalid data (missing tenant_id)', async () => {
      const invalidData = {
        name: 'Complete Blood Count'
      };

      await request(app)
        .post('/api/v1/lab-tests')
        .send(invalidData)
        .expect(400);

      expect(labTestController.createLabTest).not.toHaveBeenCalled();
    });

    it('should reject invalid data (missing name)', async () => {
      const invalidData = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174001'
      };

      await request(app)
        .post('/api/v1/lab-tests')
        .send(invalidData)
        .expect(400);

      expect(labTestController.createLabTest).not.toHaveBeenCalled();
    });

    it('should reject invalid tenant_id format', async () => {
      const invalidData = {
        tenant_id: 'invalid-uuid',
        name: 'Complete Blood Count'
      };

      await request(app)
        .post('/api/v1/lab-tests')
        .send(invalidData)
        .expect(400);

      expect(labTestController.createLabTest).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/lab-tests/:id', () => {
    it('should call updateLabTest controller with valid data', async () => {
      labTestController.updateLabTest.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Lab test updated successfully',
          data: {
            id: req.params.id,
            ...req.body
          },
          meta: { locale: 'en', direction: 'ltr' }
        });
      });

      const updateData = {
        name: 'Updated Lab Test'
      };

      const response = await request(app)
        .put('/api/v1/lab-tests/123e4567-e89b-12d3-a456-426614174000')
        .send(updateData)
        .expect(200);

      expect(labTestController.updateLabTest).toHaveBeenCalled();
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should reject invalid UUID', async () => {
      await request(app)
        .put('/api/v1/lab-tests/invalid-uuid')
        .send({ name: 'Updated Lab Test' })
        .expect(400);

      expect(labTestController.updateLabTest).not.toHaveBeenCalled();
    });

    it('should accept empty update object', async () => {
      labTestController.updateLabTest.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Lab test updated successfully',
          data: { id: req.params.id },
          meta: { locale: 'en', direction: 'ltr' }
        });
      });

      await request(app)
        .put('/api/v1/lab-tests/123e4567-e89b-12d3-a456-426614174000')
        .send({})
        .expect(200);

      expect(labTestController.updateLabTest).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/lab-tests/:id', () => {
    it('should call deleteLabTest controller with valid UUID', async () => {
      labTestController.deleteLabTest.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app)
        .delete('/api/v1/lab-tests/123e4567-e89b-12d3-a456-426614174000')
        .expect(204);

      expect(labTestController.deleteLabTest).toHaveBeenCalled();
    });

    it('should reject invalid UUID', async () => {
      await request(app)
        .delete('/api/v1/lab-tests/invalid-uuid')
        .expect(400);

      expect(labTestController.deleteLabTest).not.toHaveBeenCalled();
    });
  });
});
