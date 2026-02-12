/**
 * Pharmacy order item routes tests
 */

const request = require('supertest');
const express = require('express');

jest.mock('@controllers/pharmacy-order-item/pharmacy-order-item.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

const pharmacyOrderItemController = require('@controllers/pharmacy-order-item/pharmacy-order-item.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');
const pharmacyOrderItemRoutes = require('@routes/pharmacy-order-item/pharmacy-order-item.routes');

const app = express();
app.use(express.json());
app.use('/api/v1/pharmacy-order-items', pharmacyOrderItemRoutes);

describe('Pharmacy Order Item Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id', tenant_id: 'tenant-123' };
      next();
    });
    validateRequest.mockImplementation(() => (req, res, next) => next());

    pharmacyOrderItemController.listPharmacyOrderItems.mockImplementation((req, res) => res.status(200).json({ ok: true }));
    pharmacyOrderItemController.getPharmacyOrderItemById.mockImplementation((req, res) => res.status(200).json({ ok: true }));
    pharmacyOrderItemController.createPharmacyOrderItem.mockImplementation((req, res) => res.status(201).json({ ok: true }));
    pharmacyOrderItemController.updatePharmacyOrderItem.mockImplementation((req, res) => res.status(200).json({ ok: true }));
    pharmacyOrderItemController.deletePharmacyOrderItem.mockImplementation((req, res) => res.status(204).send());
  });

  describe('GET /api/v1/pharmacy-order-items', () => {
    it('should list pharmacy order items', async () => {
      const response = await request(app).get('/api/v1/pharmacy-order-items');
      expect(response.status).toBe(200);
      expect(pharmacyOrderItemController.listPharmacyOrderItems).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/pharmacy-order-items/:id', () => {
    it('should get pharmacy order item by id', async () => {
      const response = await request(app).get('/api/v1/pharmacy-order-items/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(200);
      expect(pharmacyOrderItemController.getPharmacyOrderItemById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/pharmacy-order-items', () => {
    it('should create pharmacy order item', async () => {
      const response = await request(app)
        .post('/api/v1/pharmacy-order-items')
        .send({
          pharmacy_order_id: '550e8400-e29b-41d4-a716-446655440000',
          drug_id: '550e8400-e29b-41d4-a716-446655440001',
          quantity: 2
        });

      expect(response.status).toBe(201);
      expect(pharmacyOrderItemController.createPharmacyOrderItem).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/pharmacy-order-items/:id', () => {
    it('should update pharmacy order item', async () => {
      const response = await request(app)
        .put('/api/v1/pharmacy-order-items/550e8400-e29b-41d4-a716-446655440000')
        .send({ quantity: 3 });

      expect(response.status).toBe(200);
      expect(pharmacyOrderItemController.updatePharmacyOrderItem).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/pharmacy-order-items/:id', () => {
    it('should delete pharmacy order item', async () => {
      const response = await request(app).delete('/api/v1/pharmacy-order-items/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(204);
      expect(pharmacyOrderItemController.deletePharmacyOrderItem).toHaveBeenCalled();
    });
  });
});

