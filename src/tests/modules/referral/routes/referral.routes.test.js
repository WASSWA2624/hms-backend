/**
 * Referral routes tests
 *
 * @module tests/modules/referral/routes
 * Per testing.mdc: Test route configuration and middleware application
 */

const request = require('supertest');
const express = require('express');

// Mock middleware
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: () => (req, res, next) => {
    req.user = { id: 'user-1' };
    next();
  }
}));

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: () => (req, res, next) => next()
}));

// Mock controller
jest.mock('@controllers/referral/referral.controller', () => ({
  listReferrals: jest.fn((req, res) => res.status(200).json({ data: [] })),
  getReferralById: jest.fn((req, res) => res.status(200).json({ data: {} })),
  createReferral: jest.fn((req, res) => res.status(201).json({ data: {} })),
  updateReferral: jest.fn((req, res) => res.status(200).json({ data: {} })),
  deleteReferral: jest.fn((req, res) => res.status(204).send())
}));

const router = require('@routes/referral/referral.routes');

describe('Referral Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/referrals', router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle GET /referrals', async () => {
    const response = await request(app).get('/referrals');
    expect(response.status).toBe(200);
  });

  it('should handle GET /referrals/:id', async () => {
    const response = await request(app).get('/referrals/550e8400-e29b-41d4-a716-446655440000');
    expect(response.status).toBe(200);
  });

  it('should handle POST /referrals', async () => {
    const response = await request(app)
      .post('/referrals')
      .send({ encounter_id: '550e8400-e29b-41d4-a716-446655440000', status: 'REQUESTED' });
    expect(response.status).toBe(201);
  });

  it('should handle PUT /referrals/:id', async () => {
    const response = await request(app)
      .put('/referrals/550e8400-e29b-41d4-a716-446655440000')
      .send({ status: 'APPROVED' });
    expect(response.status).toBe(200);
  });

  it('should handle DELETE /referrals/:id', async () => {
    const response = await request(app).delete('/referrals/550e8400-e29b-41d4-a716-446655440000');
    expect(response.status).toBe(204);
  });
});
