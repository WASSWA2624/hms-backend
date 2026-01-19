/**
 * KPI snapshot service tests
 *
 * @module tests/modules/kpi-snapshot/services
 * @description Tests for KPI snapshot service layer
 * Per testing.mdc: Comprehensive service tests with mocked repository
 */

const kpiSnapshotService = require('@modules/kpi-snapshot/services/kpi-snapshot.service');
const kpiSnapshotRepository = require('@modules/kpi-snapshot/repositories/kpi-snapshot.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock repository and audit
jest.mock('@modules/kpi-snapshot/repositories/kpi-snapshot.repository');
jest.mock('@lib/audit');

describe('KPI Snapshot Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockUserId = 'user-id-123';
  const mockIpAddress = '127.0.0.1';

  const mockKpiSnapshot = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    tenant_id: '660e8400-e29b-41d4-a716-446655440000',
    name: 'Revenue',
    value: '12500.50',
    recorded_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    version: 1
  };

  describe('listKpiSnapshots', () => {
    it('should list KPI snapshots with pagination', async () => {
      const mockSnapshots = [mockKpiSnapshot];
      kpiSnapshotRepository.findMany.mockResolvedValue(mockSnapshots);
      kpiSnapshotRepository.count.mockResolvedValue(1);

      const result = await kpiSnapshotService.listKpiSnapshots(
        {},
        1,
        20,
        'created_at',
        'desc',
        mockUserId,
        mockIpAddress
      );

      expect(result.kpiSnapshots).toEqual(mockSnapshots);
      expect(result.pagination.page).toBe(1);
    });

    it('should apply date range filters', async () => {
      const filters = { 
        recorded_at_from: '2026-01-01T00:00:00Z',
        recorded_at_to: '2026-01-31T23:59:59Z'
      };
      kpiSnapshotRepository.findMany.mockResolvedValue([mockKpiSnapshot]);
      kpiSnapshotRepository.count.mockResolvedValue(1);

      await kpiSnapshotService.listKpiSnapshots(
        filters,
        1,
        20,
        null,
        'asc',
        mockUserId,
        mockIpAddress
      );

      expect(kpiSnapshotRepository.findMany).toHaveBeenCalled();
    });
  });

  describe('getKpiSnapshotById', () => {
    it('should get KPI snapshot by ID', async () => {
      kpiSnapshotRepository.findById.mockResolvedValue(mockKpiSnapshot);

      const result = await kpiSnapshotService.getKpiSnapshotById(
        mockKpiSnapshot.id,
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(mockKpiSnapshot);
    });
  });

  describe('createKpiSnapshot', () => {
    it('should create KPI snapshot and audit log', async () => {
      kpiSnapshotRepository.create.mockResolvedValue(mockKpiSnapshot);
      createAuditLog.mockResolvedValue({});

      const result = await kpiSnapshotService.createKpiSnapshot(
        {},
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(mockKpiSnapshot);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });

  describe('updateKpiSnapshot', () => {
    it('should update KPI snapshot and audit log', async () => {
      const updated = { ...mockKpiSnapshot, value: '15000.00' };
      kpiSnapshotRepository.findById.mockResolvedValue(mockKpiSnapshot);
      kpiSnapshotRepository.update.mockResolvedValue(updated);
      createAuditLog.mockResolvedValue({});

      const result = await kpiSnapshotService.updateKpiSnapshot(
        mockKpiSnapshot.id,
        {},
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(updated);
    });
  });

  describe('deleteKpiSnapshot', () => {
    it('should soft delete KPI snapshot and audit log', async () => {
      kpiSnapshotRepository.findById.mockResolvedValue(mockKpiSnapshot);
      kpiSnapshotRepository.softDelete.mockResolvedValue({ ...mockKpiSnapshot, deleted_at: new Date() });
      createAuditLog.mockResolvedValue({});

      await kpiSnapshotService.deleteKpiSnapshot(
        mockKpiSnapshot.id,
        mockUserId,
        mockIpAddress
      );

      expect(kpiSnapshotRepository.softDelete).toHaveBeenCalled();
    });
  });
});
