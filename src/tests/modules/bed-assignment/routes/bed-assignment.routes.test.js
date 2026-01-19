/**
 * Bed Assignment routes tests
 */

const request = require('supertest');
const express = require('express');
const bedAssignmentRoutes = require('../../../../modules/bed-assignment/routes/bed-assignment.routes');
const bedAssignmentController = require('../../../../modules/bed-assignment/controllers/bed-assignment.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

jest.mock('../../../../modules/bed-assignment/controllers/bed-assignment.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-id' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Bed Assignment Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/bed-assignments', bedAssignmentRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/bed-assignments', () => {
    it('should call listBedAssignments controller', async () => {
      bedAssignmentController.listBedAssignments.mockImplementation((req, res) => res.status(200).json({ data: [] }));
      await request(app).get('/api/v1/bed-assignments');
      expect(bedAssignmentController.listBedAssignments).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/bed-assignments/:id', () => {
    it('should call getBedAssignmentById controller', async () => {
      bedAssignmentController.getBedAssignmentById.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).get('/api/v1/bed-assignments/test-id');
      expect(bedAssignmentController.getBedAssignmentById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/bed-assignments', () => {
    it('should call createBedAssignment controller', async () => {
      bedAssignmentController.createBedAssignment.mockImplementation((req, res) => res.status(201).json({ data: {} }));
      await request(app).post('/api/v1/bed-assignments').send({ admission_id: 'a-id', bed_id: 'b-id' });
      expect(bedAssignmentController.createBedAssignment).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/bed-assignments/:id', () => {
    it('should call updateBedAssignment controller', async () => {
      bedAssignmentController.updateBedAssignment.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).put('/api/v1/bed-assignments/test-id').send({ released_at: '2026-01-20T10:00:00Z' });
      expect(bedAssignmentController.updateBedAssignment).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/bed-assignments/:id', () => {
    it('should call deleteBedAssignment controller', async () => {
      bedAssignmentController.deleteBedAssignment.mockImplementation((req, res) => res.status(204).send());
      await request(app).delete('/api/v1/bed-assignments/test-id');
      expect(bedAssignmentController.deleteBedAssignment).toHaveBeenCalled();
    });
  });
});
