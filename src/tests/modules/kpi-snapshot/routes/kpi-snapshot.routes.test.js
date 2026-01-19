/**
 * KPI snapshot routes tests
 *
 * @module tests/modules/kpi-snapshot/routes
 * @description Tests for KPI snapshot routes configuration
 * Per testing.mdc: Comprehensive route tests required
 */

const express = require('express');
const request = require('supertest');
const kpiSnapshotRoutes = require('../../../modules/kpi-snapshot/routes/kpi-snapshot.routes');
const kpiSnapshotController = require('../../../modules/kpi-snapshot/controllers/kpi-snapshot.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');

jest.mock('../../../modules/kpi-snapshot/controllers/kpi-snapshot.controller');
jest.mock('@middlewares/validate.middleware');
jest.mock('@middlewares/auth.middleware');

describe('KPI Snapshot Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/kpi-snapshots', kpiSnapshotRoutes);
    authenticate.mockImplementation(() => (req, res, next) => { req.user = { id: 'user-id-123' }; next(); });
    validateRequest.mockImplementation(() => (req, res, next) => next());
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /kpi-snapshots', () => {
    it('should call listKpiSnapshots controller', async () => {
      kpiSnapshotController.listKpiSnapshots.mockImplementation((req, res) => res.status(200).json({ data: [] }));
      await request(app).get('/kpi-snapshots');
      expect(kpiSnapshotController.listKpiSnapshots).toHaveBeenCalled();
    });
  });

  describe('GET /kpi-snapshots/:id', () => {
    it('should call getKpiSnapshotById controller', async () => {
      kpiSnapshotController.getKpiSnapshotById.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).get('/kpi-snapshots/test-id');
      expect(kpiSnapshotController.getKpiSnapshotById).toHaveBeenCalled();
    });
  });

  describe('POST /kpi-snapshots', () => {
    it('should call createKpiSnapshot controller', async () => {
      kpiSnapshotController.createKpiSnapshot.mockImplementation((req, res) => res.status(201).json({ data: {} }));
      await request(app).post('/kpi-snapshots').send({});
      expect(kpiSnapshotController.createKpiSnapshot).toHaveBeenCalled();
    });
  });

  describe('PUT /kpi-snapshots/:id', () => {
    it('should call updateKpiSnapshot controller', async () => {
      kpiSnapshotController.updateKpiSnapshot.mockImplementation((req, res) => res.status(200).json({ data: {} }));
      await request(app).put('/kpi-snapshots/test-id').send({});
      expect(kpiSnapshotController.updateKpiSnapshot).toHaveBeenCalled();
    });
  });

  describe('DELETE /kpi-snapshots/:id', () => {
    it('should call deleteKpiSnapshot controller', async () => {
      kpiSnapshotController.deleteKpiSnapshot.mockImplementation((req, res) => res.status(204).send());
      await request(app).delete('/kpi-snapshots/test-id');
      expect(kpiSnapshotController.deleteKpiSnapshot).toHaveBeenCalled();
    });
  });
});
