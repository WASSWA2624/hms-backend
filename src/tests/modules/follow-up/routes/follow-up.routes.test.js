/**
 * Follow-up routes tests
 *
 * @module tests/modules/follow-up/routes
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
jest.mock('@controllers/follow-up/follow-up.controller', () => ({
  listFollowUps: jest.fn((req, res) => res.status(200).json({ data: [] })),
  getFollowUpById: jest.fn((req, res) => res.status(200).json({ data: {} })),
  createFollowUp: jest.fn((req, res) => res.status(201).json({ data: {} })),
  updateFollowUp: jest.fn((req, res) => res.status(200).json({ data: {} })),
  deleteFollowUp: jest.fn((req, res) => res.status(204).send())
}));

const router = require('@routes/follow-up/follow-up.routes');

describe('Follow-up Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/follow-ups', router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle GET /follow-ups', async () => {
    const response = await request(app).get('/follow-ups');
    expect(response.status).toBe(200);
  });

  it('should handle GET /follow-ups/:id', async () => {
    const response = await request(app).get('/follow-ups/550e8400-e29b-41d4-a716-446655440000');
    expect(response.status).toBe(200);
  });

  it('should handle POST /follow-ups', async () => {
    const response = await request(app)
      .post('/follow-ups')
      .send({
        encounter_id: '550e8400-e29b-41d4-a716-446655440000',
        scheduled_at: '2026-01-25T10:00:00.000Z'
      });
    expect(response.status).toBe(201);
  });

  it('should handle PUT /follow-ups/:id', async () => {
    const response = await request(app)
      .put('/follow-ups/550e8400-e29b-41d4-a716-446655440000')
      .send({ notes: 'Updated notes' });
    expect(response.status).toBe(200);
  });

  it('should handle DELETE /follow-ups/:id', async () => {
    const response = await request(app).delete('/follow-ups/550e8400-e29b-41d4-a716-446655440000');
    expect(response.status).toBe(204);
  });
});
