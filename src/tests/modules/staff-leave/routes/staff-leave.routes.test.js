/**
 * Staff leave routes tests
 *
 * @module tests/modules/staff-leave/routes
 * @description Tests for staff leave route endpoints
 */

const request = require('supertest');
const express = require('express');
const staffLeaveRoutes = require('../../../../modules/staff-leave/routes/staff-leave.routes');
const staffLeaveController = require('../../../../modules/staff-leave/controllers/staff-leave.controller');

// Mock dependencies
jest.mock('../../../../modules/staff-leave/controllers/staff-leave.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-id' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Staff Leave Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/staff-leaves', staffLeaveRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/staff-leaves', () => {
    it('should call listStaffLeaves controller', async () => {
      staffLeaveController.listStaffLeaves.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      await request(app).get('/api/v1/staff-leaves');

      expect(staffLeaveController.listStaffLeaves).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/staff-leaves/:id', () => {
    it('should call getStaffLeaveById controller', async () => {
      staffLeaveController.getStaffLeaveById.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      await request(app).get('/api/v1/staff-leaves/test-id');

      expect(staffLeaveController.getStaffLeaveById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/staff-leaves', () => {
    it('should call createStaffLeave controller', async () => {
      staffLeaveController.createStaffLeave.mockImplementation((req, res) => {
        res.status(201).json({ data: { id: 'new-id' } });
      });

      await request(app)
        .post('/api/v1/staff-leaves')
        .send({ staff_profile_id: 'prof-1', status: 'REQUESTED', start_date: new Date(), end_date: new Date() });

      expect(staffLeaveController.createStaffLeave).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/staff-leaves/:id', () => {
    it('should call updateStaffLeave controller', async () => {
      staffLeaveController.updateStaffLeave.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      await request(app)
        .put('/api/v1/staff-leaves/test-id')
        .send({ status: 'APPROVED' });

      expect(staffLeaveController.updateStaffLeave).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/staff-leaves/:id', () => {
    it('should call deleteStaffLeave controller', async () => {
      staffLeaveController.deleteStaffLeave.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app).delete('/api/v1/staff-leaves/test-id');

      expect(staffLeaveController.deleteStaffLeave).toHaveBeenCalled();
    });
  });
});
