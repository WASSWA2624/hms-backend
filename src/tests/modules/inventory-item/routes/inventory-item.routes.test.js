/**
 * Inventory item routes tests
 *
 * @module tests/modules/inventory-item/routes
 * @description Tests for inventory item route endpoints
 */

const request = require('supertest');
const express = require('express');
const inventoryItemRoutes = require('../../../../modules/inventory-item/routes/inventory-item.routes');
const inventoryItemController = require('../../../../modules/inventory-item/controllers/inventory-item.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('../../../../modules/inventory-item/controllers/inventory-item.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-id' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Inventory Item Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/inventory-items', inventoryItemRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/inventory-items', () => {
    it('should call listInventoryItems controller', async () => {
      inventoryItemController.listInventoryItems.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app).get('/api/v1/inventory-items');

      expect(inventoryItemController.listInventoryItems).toHaveBeenCalled();
    });

    it('should pass query parameters to controller', async () => {
      inventoryItemController.listInventoryItems.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app)
        .get('/api/v1/inventory-items')
        .query({ page: '1', limit: '20', category: 'SUPPLY' });

      expect(inventoryItemController.listInventoryItems).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/inventory-items/:id', () => {
    it('should call getInventoryItemById controller', async () => {
      inventoryItemController.getInventoryItemById.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      const response = await request(app).get('/api/v1/inventory-items/test-id');

      expect(inventoryItemController.getInventoryItemById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/inventory-items', () => {
    it('should call createInventoryItem controller', async () => {
      inventoryItemController.createInventoryItem.mockImplementation((req, res) => {
        res.status(201).json({ data: { id: 'new-id' } });
      });

      const itemData = {
        tenant_id: 'tenant-id',
        name: 'Surgical Gloves',
        category: 'SUPPLY'
      };

      const response = await request(app)
        .post('/api/v1/inventory-items')
        .send(itemData);

      expect(inventoryItemController.createInventoryItem).toHaveBeenCalled();
    });

    it('should accept optional fields', async () => {
      inventoryItemController.createInventoryItem.mockImplementation((req, res) => {
        res.status(201).json({ data: { id: 'new-id' } });
      });

      const itemData = {
        tenant_id: 'tenant-id',
        name: 'Surgical Gloves',
        category: 'SUPPLY',
        sku: 'SG-001',
        unit: 'Box'
      };

      const response = await request(app)
        .post('/api/v1/inventory-items')
        .send(itemData);

      expect(inventoryItemController.createInventoryItem).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/inventory-items/:id', () => {
    it('should call updateInventoryItem controller', async () => {
      inventoryItemController.updateInventoryItem.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      const updateData = { name: 'Updated Gloves' };

      const response = await request(app)
        .put('/api/v1/inventory-items/test-id')
        .send(updateData);

      expect(inventoryItemController.updateInventoryItem).toHaveBeenCalled();
    });

    it('should accept partial updates', async () => {
      inventoryItemController.updateInventoryItem.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      const updateData = { category: 'EQUIPMENT', sku: 'SG-002' };

      const response = await request(app)
        .put('/api/v1/inventory-items/test-id')
        .send(updateData);

      expect(inventoryItemController.updateInventoryItem).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/inventory-items/:id', () => {
    it('should call deleteInventoryItem controller', async () => {
      inventoryItemController.deleteInventoryItem.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/inventory-items/test-id');

      expect(inventoryItemController.deleteInventoryItem).toHaveBeenCalled();
    });
  });
});
