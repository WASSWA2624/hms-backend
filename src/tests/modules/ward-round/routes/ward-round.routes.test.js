/**
 * Ward Round routes tests
 */

const request = require('supertest');
const express = require('express');
const wardRoundRoutes = require('../../../../modules/ward-round/routes/ward-round.routes');
const wardRoundController = require('../../../../modules/ward-round/controllers/ward-round.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

jest.mock('../../../../modules/ward-round/controllers/ward-round.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-id' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Ward Round Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/ward-rounds', wardRoundRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/ward-rounds', () => {
    it('should call listWardRounds controller', async () => {
      wardRoundController.listWardRounds.mockImplementation((req, res) => res.status(200).json({ data: [] }));
      await request(app).get('/api/v1/ward-rounds');
      expect(wardRoundController.listWardRounds).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/ward-rounds/:id', () => {
    it('should call getWardRoundById controller', async () => {
      wardRoundController.getWardRoundById.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).get('/api/v1/ward-rounds/test-id');
      expect(wardRoundController.getWardRoundById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/ward-rounds', () => {
    it('should call createWardRound controller', async () => {
      wardRoundController.createWardRound.mockImplementation((req, res) => res.status(201).json({ data: {} }));
      await request(app).post('/api/v1/ward-rounds').send({ admission_id: 'a-id', notes: 'Patient stable' });
      expect(wardRoundController.createWardRound).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/ward-rounds/:id', () => {
    it('should call updateWardRound controller', async () => {
      wardRoundController.updateWardRound.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).put('/api/v1/ward-rounds/test-id').send({ notes: 'Updated notes' });
      expect(wardRoundController.updateWardRound).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/ward-rounds/:id', () => {
    it('should call deleteWardRound controller', async () => {
      wardRoundController.deleteWardRound.mockImplementation((req, res) => res.status(204).send());
      await request(app).delete('/api/v1/ward-rounds/test-id');
      expect(wardRoundController.deleteWardRound).toHaveBeenCalled();
    });
  });
});
