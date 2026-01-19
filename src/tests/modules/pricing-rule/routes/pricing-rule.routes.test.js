/**
 * Pricing Rule routes tests
 *
 * @module tests/modules/pricing-rule/routes
 * @description Tests for pricing rule route definitions
 * Per testing.mdc: Test route configuration and middleware application
 */

const express = require('express');
const request = require('supertest');
const pricingRuleRoutes = require('@routes/pricing-rule/pricing-rule.routes');
const pricingRuleController = require('@controllers/pricing-rule/pricing-rule.controller');
const { authenticate } = require('@middlewares/auth.middleware');

jest.mock('@controllers/pricing-rule/pricing-rule.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Pricing Rule Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Mock authenticate middleware
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: '550e8400-e29b-41d4-a716-446655440000' };
      next();
    });

    // Mock all controller methods
    pricingRuleController.listPricingRules.mockImplementation((req, res) => 
      res.json({ success: true, data: [] })
    );
    pricingRuleController.getPricingRuleById.mockImplementation((req, res) => 
      res.json({ success: true, data: {} })
    );
    pricingRuleController.createPricingRule.mockImplementation((req, res) => 
      res.status(201).json({ success: true, data: {} })
    );
    pricingRuleController.updatePricingRule.mockImplementation((req, res) => 
      res.json({ success: true, data: {} })
    );
    pricingRuleController.deletePricingRule.mockImplementation((req, res) => 
      res.status(204).send()
    );

    app.use('/pricing-rules', pricingRuleRoutes);
  });

  describe('GET /pricing-rules', () => {
    it('should call listPricingRules controller', async () => {
      await request(app).get('/pricing-rules');
      expect(pricingRuleController.listPricingRules).toHaveBeenCalled();
    });
  });

  describe('GET /pricing-rules/:id', () => {
    it('should call getPricingRuleById controller', async () => {
      await request(app).get('/pricing-rules/550e8400-e29b-41d4-a716-446655440000');
      expect(pricingRuleController.getPricingRuleById).toHaveBeenCalled();
    });
  });

  describe('POST /pricing-rules', () => {
    it('should call createPricingRule controller', async () => {
      await request(app)
        .post('/pricing-rules')
        .send({ name: 'Test', amount: 50, currency: 'USD' });
      expect(pricingRuleController.createPricingRule).toHaveBeenCalled();
    });
  });

  describe('PUT /pricing-rules/:id', () => {
    it('should call updatePricingRule controller', async () => {
      await request(app)
        .put('/pricing-rules/550e8400-e29b-41d4-a716-446655440000')
        .send({ name: 'Updated' });
      expect(pricingRuleController.updatePricingRule).toHaveBeenCalled();
    });
  });

  describe('DELETE /pricing-rules/:id', () => {
    it('should call deletePricingRule controller', async () => {
      await request(app).delete('/pricing-rules/550e8400-e29b-41d4-a716-446655440000');
      expect(pricingRuleController.deletePricingRule).toHaveBeenCalled();
    });
  });
});
