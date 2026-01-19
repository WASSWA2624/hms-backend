/**
 * Lab panel routes tests
 *
 * @module tests/modules/lab-panel/routes
 * @description Tests for lab panel routes
 * Per testing.mdc: All routes must be tested
 */

const request = require('supertest');
const express = require('express');
const labPanelRoutes = require('@routes/lab-panel/lab-panel.routes');
const labPanelController = require('@controllers/lab-panel/lab-panel.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/lab-panels', labPanelRoutes);

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
jest.mock('@controllers/lab-panel/lab-panel.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

describe('Lab Panel Routes', () => {
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

  describe('GET /api/v1/lab-panels', () => {
    it('should call listLabPanels controller', async () => {
      labPanelController.listLabPanels.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Lab panels retrieved successfully',
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
        .get('/api/v1/lab-panels')
        .expect(200);

      expect(labPanelController.listLabPanels).toHaveBeenCalled();
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should accept valid query parameters', async () => {
      labPanelController.listLabPanels.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Lab panels retrieved successfully',
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
        .get('/api/v1/lab-panels')
        .query({
          tenant_id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Metabolic',
          code: 'CMP',
          page: 1,
          limit: 20
        })
        .expect(200);

      expect(labPanelController.listLabPanels).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/lab-panels/:id', () => {
    it('should call getLabPanelById controller with valid UUID', async () => {
      labPanelController.getLabPanelById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Lab panel retrieved successfully',
          data: { id: req.params.id, name: 'Complete Metabolic Panel' },
          meta: { locale: 'en', direction: 'ltr' }
        });
      });

      const response = await request(app)
        .get('/api/v1/lab-panels/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(labPanelController.getLabPanelById).toHaveBeenCalled();
      expect(response.body.data.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should reject invalid UUID', async () => {
      await request(app)
        .get('/api/v1/lab-panels/invalid-uuid')
        .expect(400);

      expect(labPanelController.getLabPanelById).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/lab-panels', () => {
    it('should call createLabPanel controller with valid data', async () => {
      labPanelController.createLabPanel.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Lab panel created successfully',
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            ...req.body
          },
          meta: { locale: 'en', direction: 'ltr' }
        });
      });

      const newLabPanel = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Complete Metabolic Panel',
        code: 'CMP'
      };

      const response = await request(app)
        .post('/api/v1/lab-panels')
        .send(newLabPanel)
        .expect(201);

      expect(labPanelController.createLabPanel).toHaveBeenCalled();
      expect(response.body.data.name).toBe(newLabPanel.name);
    });

    it('should reject invalid data (missing tenant_id)', async () => {
      const invalidData = {
        name: 'Complete Metabolic Panel'
      };

      await request(app)
        .post('/api/v1/lab-panels')
        .send(invalidData)
        .expect(400);

      expect(labPanelController.createLabPanel).not.toHaveBeenCalled();
    });

    it('should reject invalid data (missing name)', async () => {
      const invalidData = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174001'
      };

      await request(app)
        .post('/api/v1/lab-panels')
        .send(invalidData)
        .expect(400);

      expect(labPanelController.createLabPanel).not.toHaveBeenCalled();
    });

    it('should reject invalid tenant_id format', async () => {
      const invalidData = {
        tenant_id: 'invalid-uuid',
        name: 'Complete Metabolic Panel'
      };

      await request(app)
        .post('/api/v1/lab-panels')
        .send(invalidData)
        .expect(400);

      expect(labPanelController.createLabPanel).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/lab-panels/:id', () => {
    it('should call updateLabPanel controller with valid data', async () => {
      labPanelController.updateLabPanel.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Lab panel updated successfully',
          data: {
            id: req.params.id,
            ...req.body
          },
          meta: { locale: 'en', direction: 'ltr' }
        });
      });

      const updateData = {
        name: 'Updated Lab Panel'
      };

      const response = await request(app)
        .put('/api/v1/lab-panels/123e4567-e89b-12d3-a456-426614174000')
        .send(updateData)
        .expect(200);

      expect(labPanelController.updateLabPanel).toHaveBeenCalled();
      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should reject invalid UUID', async () => {
      await request(app)
        .put('/api/v1/lab-panels/invalid-uuid')
        .send({ name: 'Updated Lab Panel' })
        .expect(400);

      expect(labPanelController.updateLabPanel).not.toHaveBeenCalled();
    });

    it('should accept empty update object', async () => {
      labPanelController.updateLabPanel.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Lab panel updated successfully',
          data: { id: req.params.id },
          meta: { locale: 'en', direction: 'ltr' }
        });
      });

      await request(app)
        .put('/api/v1/lab-panels/123e4567-e89b-12d3-a456-426614174000')
        .send({})
        .expect(200);

      expect(labPanelController.updateLabPanel).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/lab-panels/:id', () => {
    it('should call deleteLabPanel controller with valid UUID', async () => {
      labPanelController.deleteLabPanel.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app)
        .delete('/api/v1/lab-panels/123e4567-e89b-12d3-a456-426614174000')
        .expect(204);

      expect(labPanelController.deleteLabPanel).toHaveBeenCalled();
    });

    it('should reject invalid UUID', async () => {
      await request(app)
        .delete('/api/v1/lab-panels/invalid-uuid')
        .expect(400);

      expect(labPanelController.deleteLabPanel).not.toHaveBeenCalled();
    });
  });
});
