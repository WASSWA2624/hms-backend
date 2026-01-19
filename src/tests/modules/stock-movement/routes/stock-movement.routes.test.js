/**
 * Stock movement routes tests
 * @module tests/modules/stock-movement/routes
 */

const express = require('express');
const request = require('supertest');
const stockMovementRoutes = require('../../../modules/stock-movement/routes/stock-movement.routes');
const stockMovementController = require('../../../modules/stock-movement/controllers/stock-movement.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

jest.mock('../../../modules/stock-movement/controllers/stock-movement.controller');
jest.mock('@middlewares/validate.middleware');
jest.mock('@middlewares/auth.middleware');

describe('Stock Movement Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/stock-movements', stockMovementRoutes);
    authenticate.mockImplementation(() => (req, res, next) => { req.user = { id: 'user-123' }; next(); });
    validateRequest.mockImplementation(() => (req, res, next) => next());
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /stock-movements', () => {
    it('should call listStockMovements controller', async () => {
      stockMovementController.listStockMovements.mockImplementation((req, res) => res.status(200).json({ data: [] }));
      await request(app).get('/stock-movements');
      expect(stockMovementController.listStockMovements).toHaveBeenCalled();
    });
  });

  describe('GET /stock-movements/:id', () => {
    it('should call getStockMovementById controller', async () => {
      stockMovementController.getStockMovementById.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).get('/stock-movements/test-id');
      expect(stockMovementController.getStockMovementById).toHaveBeenCalled();
    });
  });

  describe('POST /stock-movements', () => {
    it('should call createStockMovement controller', async () => {
      stockMovementController.createStockMovement.mockImplementation((req, res) => res.status(201).json({ data: {} }));
      await request(app).post('/stock-movements').send({});
      expect(stockMovementController.createStockMovement).toHaveBeenCalled();
    });
  });

  describe('PUT /stock-movements/:id', () => {
    it('should call updateStockMovement controller', async () => {
      stockMovementController.updateStockMovement.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).put('/stock-movements/test-id').send({});
      expect(stockMovementController.updateStockMovement).toHaveBeenCalled();
    });
  });

  describe('DELETE /stock-movements/:id', () => {
    it('should call deleteStockMovement controller', async () => {
      stockMovementController.deleteStockMovement.mockImplementation((req, res) => res.status(204).send());
      await request(app).delete('/stock-movements/test-id');
      expect(stockMovementController.deleteStockMovement).toHaveBeenCalled();
    });
  });
});
