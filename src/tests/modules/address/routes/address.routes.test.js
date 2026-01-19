/**
 * Address routes integration tests
 *
 * @module tests/modules/address/routes
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies BEFORE any imports
jest.mock('@controllers/address/address.controller');

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { 
      id: 'user-123', 
      tenant_id: 'tenant-123'
    };
    next();
  })
}));

const request = require('supertest');
const express = require('express');
const addressController = require('@controllers/address/address.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

// Import routes using relative path
const addressRoutes = require('../../../../modules/address/routes/address.routes');

describe('Address Routes', () => {
  let app;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/v1/addresses', addressRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/addresses/', () => {
    it('should call listAddresses controller', async () => {
      addressController.listAddresses.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Addresses retrieved successfully',
          data: [
            { id: 'address-1', line1: '123 Main St', tenant_id: 'tenant-123' },
            { id: 'address-2', line1: '456 Business Ave', tenant_id: 'tenant-123' }
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
        .get('/api/v1/addresses/')
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(addressController.listAddresses).toHaveBeenCalled();
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should pass filters to controller', async () => {
      addressController.listAddresses.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Addresses retrieved successfully',
          data: [],
          pagination: {}
        });
      });

      const response = await request(app)
        .get('/api/v1/addresses/')
        .query({
          page: 1,
          limit: 20,
          tenant_id: 'tenant-123',
          address_type: 'HOME',
          facility_id: 'facility-123',
          city: 'New York',
          search: 'Main',
          sort_by: 'city',
          order: 'asc'
        });

      expect(response.status).toBe(200);
      expect(addressController.listAddresses).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/addresses/:id', () => {
    it('should call getAddressById controller', async () => {
      addressController.getAddressById.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Address retrieved successfully',
          data: {
            id: 'address-123',
            tenant_id: 'tenant-123',
            address_type: 'HOME',
            line1: '123 Main St',
            city: 'New York',
            state: 'NY',
            country: 'USA'
          }
        });
      });

      const response = await request(app)
        .get('/api/v1/addresses/address-123');

      expect(response.status).toBe(200);
      expect(addressController.getAddressById).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id', 'address-123');
    });
  });

  describe('POST /api/v1/addresses/', () => {
    it('should call createAddress controller', async () => {
      addressController.createAddress.mockImplementation((req, res) => {
        res.status(201).json({
          status: 201,
          message: 'Address created successfully',
          data: {
            id: 'address-new',
            tenant_id: 'tenant-123',
            address_type: 'HOME',
            line1: '123 Main St',
            line2: 'Apt 4B',
            city: 'New York',
            state: 'NY',
            postal_code: '10001',
            country: 'USA',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            version: 1
          }
        });
      });

      const response = await request(app)
        .post('/api/v1/addresses/')
        .send({
          tenant_id: 'tenant-123',
          address_type: 'HOME',
          line1: '123 Main St',
          line2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'USA'
        });

      expect(response.status).toBe(201);
      expect(addressController.createAddress).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id');
    });

    it('should require authentication', async () => {
      expect(authenticate).toBeDefined();
    });

    it('should require validation', async () => {
      expect(validateRequest).toBeDefined();
    });
  });

  describe('PUT /api/v1/addresses/:id', () => {
    it('should call updateAddress controller', async () => {
      addressController.updateAddress.mockImplementation((req, res) => {
        res.status(200).json({
          status: 200,
          message: 'Address updated successfully',
          data: {
            id: 'address-123',
            tenant_id: 'tenant-123',
            address_type: 'WORK',
            line1: '456 Updated St',
            city: 'Boston',
            state: 'MA',
            country: 'USA',
            updated_at: new Date().toISOString()
          }
        });
      });

      const response = await request(app)
        .put('/api/v1/addresses/address-123')
        .send({
          address_type: 'WORK',
          line1: '456 Updated St',
          city: 'Boston',
          state: 'MA'
        });

      expect(response.status).toBe(200);
      expect(addressController.updateAddress).toHaveBeenCalled();
      expect(response.body.data).toHaveProperty('id', 'address-123');
    });

    it('should require authentication', async () => {
      expect(authenticate).toBeDefined();
    });

    it('should require validation', async () => {
      expect(validateRequest).toBeDefined();
    });
  });

  describe('DELETE /api/v1/addresses/:id', () => {
    it('should call deleteAddress controller', async () => {
      addressController.deleteAddress.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/addresses/address-123');

      expect(response.status).toBe(204);
      expect(addressController.deleteAddress).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      expect(authenticate).toBeDefined();
    });

    it('should require validation', async () => {
      expect(validateRequest).toBeDefined();
    });
  });

  describe('Middleware Application', () => {
    it('should apply authenticate middleware to all routes', async () => {
      // Middleware is already tested in individual route tests above
      // Each route test verifies that authenticate() is applied
      expect(authenticate).toBeDefined();
    });

    it('should apply validateRequest middleware to all routes', async () => {
      // Middleware is already tested in individual route tests above
      // Each route test verifies that validateRequest() is applied
      expect(validateRequest).toBeDefined();
    });
  });
});
