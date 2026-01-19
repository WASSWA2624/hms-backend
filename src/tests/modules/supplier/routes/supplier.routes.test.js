/**
 * Supplier routes tests
 *
 * @module tests/modules/supplier/routes
 * @description Integration tests for supplier routes
 */

const request = require('supertest');
const express = require('express');
const supplierRoutes = require('@modules/supplier/routes/supplier.routes');
const supplierController = require('@modules/supplier/controllers/supplier.controller');
const validate = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('@modules/supplier/controllers/supplier.controller');
jest.mock('@middlewares/validate.middleware', () => jest.fn(() => (req, res, next) => next()));

describe('Supplier Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/suppliers', supplierRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/suppliers', () => {
    it('should call listSuppliers controller', async () => {
      supplierController.listSuppliers.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app)
        .get('/api/v1/suppliers')
        .expect(200);

      expect(supplierController.listSuppliers).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/suppliers/:id', () => {
    it('should call getSupplier controller', async () => {
      supplierController.getSupplier.mockImplementation((req, res) => {
        res.status(200).json({ data: {} });
      });

      const response = await request(app)
        .get('/api/v1/suppliers/550e8400-e29b-41d4-a716-446655440000')
        .expect(200);

      expect(supplierController.getSupplier).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/suppliers', () => {
    it('should call createSupplier controller', async () => {
      supplierController.createSupplier.mockImplementation((req, res) => {
        res.status(201).json({ data: {} });
      });

      const supplierData = {
        tenant_id: '660e8400-e29b-41d4-a716-446655440000',
        name: 'Medical Supplies Inc'
      };

      const response = await request(app)
        .post('/api/v1/suppliers')
        .send(supplierData)
        .expect(201);

      expect(supplierController.createSupplier).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/suppliers/:id', () => {
    it('should call updateSupplier controller', async () => {
      supplierController.updateSupplier.mockImplementation((req, res) => {
        res.status(200).json({ data: {} });
      });

      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put('/api/v1/suppliers/550e8400-e29b-41d4-a716-446655440000')
        .send(updateData)
        .expect(200);

      expect(supplierController.updateSupplier).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/suppliers/:id', () => {
    it('should call deleteSupplier controller', async () => {
      supplierController.deleteSupplier.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/suppliers/550e8400-e29b-41d4-a716-446655440000')
        .expect(204);

      expect(supplierController.deleteSupplier).toHaveBeenCalled();
    });
  });
});
