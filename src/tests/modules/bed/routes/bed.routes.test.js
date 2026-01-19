/**
 * Bed routes integration tests
 *
 * @module tests/modules/bed/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/bed/bed.controller');

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
const bedController = require('@controllers/bed/bed.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const bedRoutes = require('../../../../modules/bed/routes/bed.routes');

describe('Bed Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/beds', bedRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/beds/', () => {
    it('should call listBeds controller', async () => {
      bedController.listBeds.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Beds retrieved successfully',
          data: [
            { id: 'bed-1', label: 'Bed 101', tenant_id: 'tenant-123', status: 'AVAILABLE' },
            { id: 'bed-2', label: 'Bed 102', tenant_id: 'tenant-123', status: 'OCCUPIED' }
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
        .get('/api/v1/beds/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(bedController.listBeds).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should pass filters to controller', async () => {
      bedController.listBeds.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Beds retrieved successfully',
          data: [],
          pagination: {}
        });
      });

      const response = await request(app)
        .get('/api/v1/beds/')
        .query({
          page: 1,
          limit: 20,
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          ward_id: 'ward-123',
          room_id: 'room-123',
          status: 'AVAILABLE',
          search: 'bed',
          sort_by: 'label',
          order: 'asc'
        });

      expect(response.status).toBe(200);
      expect(bedController.listBeds).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/beds/:id', () => {
    it('should call getBedById controller', async () => {
      bedController.getBedById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Bed retrieved successfully',
          data: {
            id: 'bed-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            ward_id: 'ward-123',
            room_id: 'room-123',
            label: 'Bed 101',
            status: 'AVAILABLE',
            created_at: new Date('2026-01-19').toISOString(),
            updated_at: new Date('2026-01-19').toISOString()
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/beds/bed-123');

      expect(response.status).toBe(200);
      expect(bedController.getBedById).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 'bed-123');
    });
  });

  describe('POST /api/v1/beds/', () => {
    it('should call createBed controller', async () => {
      const bedData = {
        tenant_id: 'tenant-123',
        facility_id: 'facility-123',
        ward_id: 'ward-123',
        room_id: 'room-123',
        label: 'Bed 101',
        status: 'AVAILABLE'
      };

      bedController.createBed.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Bed created successfully',
          data: {
            id: 'bed-123',
            ...bedData,
            created_at: new Date('2026-01-19').toISOString(),
            updated_at: new Date('2026-01-19').toISOString()
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/beds/')
        .send(bedData);

      expect(response.status).toBe(201);
      expect(bedController.createBed).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
    });
  });

  describe('PUT /api/v1/beds/:id', () => {
    it('should call updateBed controller', async () => {
      const updateData = {
        label: 'Updated Bed',
        status: 'OCCUPIED'
      };

      bedController.updateBed.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Bed updated successfully',
          data: {
            id: 'bed-123',
            tenant_id: 'tenant-123',
            facility_id: 'facility-123',
            ward_id: 'ward-123',
            room_id: 'room-123',
            ...updateData,
            created_at: new Date('2026-01-19').toISOString(),
            updated_at: new Date('2026-01-19').toISOString()
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/beds/bed-123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(bedController.updateBed).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.label).toBe('Updated Bed');
    });
  });

  describe('DELETE /api/v1/beds/:id', () => {
    it('should call deleteBed controller', async () => {
      bedController.deleteBed.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/beds/bed-123');

      expect(response.status).toBe(204);
      expect(bedController.deleteBed).toHaveBeenCalled();
    });
  });

  describe('Middleware integration', () => {
    it('should call authenticate middleware for all routes', async () => {
      bedController.listBeds.mockImplementation((req, res) => {
        res.status(200).json({ data: [], pagination: {} });
      });

      await request(app).get('/api/v1/beds/');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validateRequest middleware for all routes', async () => {
      bedController.listBeds.mockImplementation((req, res) => {
        res.status(200).json({ data: [], pagination: {} });
      });

      await request(app).get('/api/v1/beds/');

      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
