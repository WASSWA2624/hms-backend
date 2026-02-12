/**
 * Invoice item routes tests
 */

const request = require('supertest');
const express = require('express');

jest.mock('@controllers/invoice-item/invoice-item.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

const invoiceItemController = require('@controllers/invoice-item/invoice-item.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');
const invoiceItemRoutes = require('@routes/invoice-item/invoice-item.routes');

const app = express();
app.use(express.json());
app.use('/api/v1/invoice-items', invoiceItemRoutes);

describe('Invoice Item Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id', tenant_id: 'tenant-123' };
      next();
    });
    validateRequest.mockImplementation(() => (req, res, next) => next());

    invoiceItemController.listInvoiceItems.mockImplementation((req, res) => res.status(200).json({ ok: true }));
    invoiceItemController.getInvoiceItemById.mockImplementation((req, res) => res.status(200).json({ ok: true }));
    invoiceItemController.createInvoiceItem.mockImplementation((req, res) => res.status(201).json({ ok: true }));
    invoiceItemController.updateInvoiceItem.mockImplementation((req, res) => res.status(200).json({ ok: true }));
    invoiceItemController.deleteInvoiceItem.mockImplementation((req, res) => res.status(204).send());
  });

  describe('GET /api/v1/invoice-items', () => {
    it('should list invoice items', async () => {
      const response = await request(app).get('/api/v1/invoice-items');
      expect(response.status).toBe(200);
      expect(invoiceItemController.listInvoiceItems).toHaveBeenCalled();
    });

    it('should apply authentication and validation', async () => {
      await request(app).get('/api/v1/invoice-items');
      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/invoice-items/:id', () => {
    it('should get invoice item by id', async () => {
      const response = await request(app).get('/api/v1/invoice-items/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(200);
      expect(invoiceItemController.getInvoiceItemById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/invoice-items', () => {
    it('should create invoice item', async () => {
      const response = await request(app)
        .post('/api/v1/invoice-items')
        .send({
          invoice_id: '550e8400-e29b-41d4-a716-446655440000',
          description: 'Consultation',
          unit_price: '50.00',
          total_price: '50.00'
        });

      expect(response.status).toBe(201);
      expect(invoiceItemController.createInvoiceItem).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/invoice-items/:id', () => {
    it('should update invoice item', async () => {
      const response = await request(app)
        .put('/api/v1/invoice-items/550e8400-e29b-41d4-a716-446655440000')
        .send({ description: 'Updated item' });

      expect(response.status).toBe(200);
      expect(invoiceItemController.updateInvoiceItem).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/invoice-items/:id', () => {
    it('should delete invoice item', async () => {
      const response = await request(app).delete('/api/v1/invoice-items/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(204);
      expect(invoiceItemController.deleteInvoiceItem).toHaveBeenCalled();
    });
  });
});

