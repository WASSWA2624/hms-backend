/**
 * Staff assignment routes tests
 *
 * @module tests/modules/staff-assignment/routes
 * @description Tests for staff assignment route endpoints
 */

const request = require('supertest');
const express = require('express');
const staffAssignmentRoutes = require('../../../../modules/staff-assignment/routes/staff-assignment.routes');
const staffAssignmentController = require('../../../../modules/staff-assignment/controllers/staff-assignment.controller');

// Mock dependencies
jest.mock('../../../../modules/staff-assignment/controllers/staff-assignment.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-id' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Staff Assignment Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/staff-assignments', staffAssignmentRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/staff-assignments', () => {
    it('should call listStaffAssignments controller', async () => {
      staffAssignmentController.listStaffAssignments.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      await request(app).get('/api/v1/staff-assignments');

      expect(staffAssignmentController.listStaffAssignments).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/staff-assignments/:id', () => {
    it('should call getStaffAssignmentById controller', async () => {
      staffAssignmentController.getStaffAssignmentById.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      await request(app).get('/api/v1/staff-assignments/test-id');

      expect(staffAssignmentController.getStaffAssignmentById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/staff-assignments', () => {
    it('should call createStaffAssignment controller', async () => {
      staffAssignmentController.createStaffAssignment.mockImplementation((req, res) => {
        res.status(201).json({ data: { id: 'new-id' } });
      });

      await request(app)
        .post('/api/v1/staff-assignments')
        .send({ staff_profile_id: 'prof-1', start_date: new Date() });

      expect(staffAssignmentController.createStaffAssignment).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/staff-assignments/:id', () => {
    it('should call updateStaffAssignment controller', async () => {
      staffAssignmentController.updateStaffAssignment.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      await request(app)
        .put('/api/v1/staff-assignments/test-id')
        .send({ department_id: 'dept-2' });

      expect(staffAssignmentController.updateStaffAssignment).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/staff-assignments/:id', () => {
    it('should call deleteStaffAssignment controller', async () => {
      staffAssignmentController.deleteStaffAssignment.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app).delete('/api/v1/staff-assignments/test-id');

      expect(staffAssignmentController.deleteStaffAssignment).toHaveBeenCalled();
    });
  });
});
