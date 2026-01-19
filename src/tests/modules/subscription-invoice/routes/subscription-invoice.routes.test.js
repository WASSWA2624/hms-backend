/**
 * Subscription Invoice routes tests
 *
 * @module tests/modules/subscription-invoice/routes
 * @description Tests for subscription invoice route endpoints
 */

const request = require('supertest');
const express = require('express');
const subscriptionInvoiceRoutes = require('../../../../modules/subscription-invoice/routes/subscription-invoice.routes');
const subscriptionInvoiceController = require('../../../../modules/subscription-invoice/controllers/subscription-invoice.controller');

jest.mock('../../../../modules/subscription-invoice/controllers/subscription-invoice.controller');
jest.mock('@lib/async', () => ({
  asyncHandler: (fn) => fn
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validate: () => (req, res, next) => next()
}));

const app = express();
app.use(express.json());
app.use('/subscription-invoices', subscriptionInvoiceRoutes);

describe('Subscription Invoice Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /subscription-invoices', () => {
    it('should call listSubscriptionInvoices controller', async () => {
      subscriptionInvoiceController.listSubscriptionInvoices.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/subscription-invoices');

      expect(response.status).toBe(200);
      expect(subscriptionInvoiceController.listSubscriptionInvoices).toHaveBeenCalled();
    });
  });

  describe('GET /subscription-invoices/:id', () => {
    it('should call getSubscriptionInvoice controller', async () => {
      subscriptionInvoiceController.getSubscriptionInvoice.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/subscription-invoices/123');

      expect(response.status).toBe(200);
      expect(subscriptionInvoiceController.getSubscriptionInvoice).toHaveBeenCalled();
    });
  });

  describe('POST /subscription-invoices', () => {
    it('should call createSubscriptionInvoice controller', async () => {
      subscriptionInvoiceController.createSubscriptionInvoice.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/subscription-invoices')
        .send({ subscription_id: '456', invoice_id: '789' });

      expect(response.status).toBe(201);
      expect(subscriptionInvoiceController.createSubscriptionInvoice).toHaveBeenCalled();
    });
  });

  describe('PUT /subscription-invoices/:id', () => {
    it('should call updateSubscriptionInvoice controller', async () => {
      subscriptionInvoiceController.updateSubscriptionInvoice.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put('/subscription-invoices/123')
        .send({ invoice_id: '999' });

      expect(response.status).toBe(200);
      expect(subscriptionInvoiceController.updateSubscriptionInvoice).toHaveBeenCalled();
    });
  });

  describe('DELETE /subscription-invoices/:id', () => {
    it('should call deleteSubscriptionInvoice controller', async () => {
      subscriptionInvoiceController.deleteSubscriptionInvoice.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete('/subscription-invoices/123');

      expect(response.status).toBe(204);
      expect(subscriptionInvoiceController.deleteSubscriptionInvoice).toHaveBeenCalled();
    });
  });
});
