/**
 * Inventory stock routes tests
 * @module tests/modules/inventory-stock/routes
 */

const express = require('express');
const request = require('supertest');
const inventoryStockRoutes = require('../../../modules/inventory-stock/routes/inventory-stock.routes');
const inventoryStockController = require('../../../modules/inventory-stock/controllers/inventory-stock.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

jest.mock('../../../modules/inventory-stock/controllers/inventory-stock.controller');
jest.mock('@middlewares/validate.middleware');
jest.mock('@middlewares/auth.middleware');

describe('Inventory Stock Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/inventory-stocks', inventoryStockRoutes);
    authenticate.mockImplementation(() => (req, res, next) => { req.user = { id: 'user-123' }; next(); });
    validateRequest.mockImplementation(() => (req, res, next) => next());
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /inventory-stocks', () => {
    it('should call listInventoryStocks controller', async () => {
      inventoryStockController.listInventoryStocks.mockImplementation((req, res) => res.status(200).json({ data: [] }));
      await request(app).get('/inventory-stocks');
      expect(inventoryStockController.listInventoryStocks).toHaveBeenCalled();
    });
  });

  describe('GET /inventory-stocks/:id', () => {
    it('should call getInventoryStockById controller', async () => {
      inventoryStockController.getInventoryStockById.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).get('/inventory-stocks/test-id');
      expect(inventoryStockController.getInventoryStockById).toHaveBeenCalled();
    });
  });

  describe('POST /inventory-stocks', () => {
    it('should call createInventoryStock controller', async () => {
      inventoryStockController.createInventoryStock.mockImplementation((req, res) => res.status(201).json({ data: {} }));
      await request(app).post('/inventory-stocks').send({});
      expect(inventoryStockController.createInventoryStock).toHaveBeenCalled();
    });
  });

  describe('PUT /inventory-stocks/:id', () => {
    it('should call updateInventoryStock controller', async () => {
      inventoryStockController.updateInventoryStock.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).put('/inventory-stocks/test-id').send({});
      expect(inventoryStockController.updateInventoryStock).toHaveBeenCalled();
    });
  });

  describe('DELETE /inventory-stocks/:id', () => {
    it('should call deleteInventoryStock controller', async () => {
      inventoryStockController.deleteInventoryStock.mockImplementation((req, res) => res.status(204).send());
      await request(app).delete('/inventory-stocks/test-id');
      expect(inventoryStockController.deleteInventoryStock).toHaveBeenCalled();
    });
  });
});
