/**
 * KPI snapshot repository tests
 *
 * @module tests/modules/kpi-snapshot/repositories
 * @description Tests for KPI snapshot repository operations
 * Per testing.mdc: Comprehensive repository tests with mocked Prisma client
 */

const kpiSnapshotRepository = require('@modules/kpi-snapshot/repositories/kpi-snapshot.repository');
const prisma = require('@prisma/client');
const { HttpError } = require('@lib/errors');

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  kpi_snapshot: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
}));

describe('KPI Snapshot Repository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

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

  describe('findById', () => {
    it('should find KPI snapshot by ID', async () => {
      prisma.kpi_snapshot.findFirst.mockResolvedValue(mockKpiSnapshot);

      const result = await kpiSnapshotRepository.findById(mockKpiSnapshot.id);

      expect(result).toEqual(mockKpiSnapshot);
      expect(prisma.kpi_snapshot.findFirst).toHaveBeenCalledWith({
        where: { id: mockKpiSnapshot.id, deleted_at: null },
        include: {}
      });
    });

    it('should return null if KPI snapshot not found', async () => {
      prisma.kpi_snapshot.findFirst.mockResolvedValue(null);

      const result = await kpiSnapshotRepository.findById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should throw HttpError on database error', async () => {
      prisma.kpi_snapshot.findFirst.mockRejectedValue(new Error('DB Error'));

      await expect(kpiSnapshotRepository.findById('some-id')).rejects.toThrow(HttpError);
    });
  });

  describe('findMany', () => {
    it('should find KPI snapshots with default parameters', async () => {
      prisma.kpi_snapshot.findMany.mockResolvedValue([mockKpiSnapshot]);

      const result = await kpiSnapshotRepository.findMany();

      expect(result).toEqual([mockKpiSnapshot]);
    });

    it('should apply filters correctly', async () => {
      const filters = { tenant_id: mockKpiSnapshot.tenant_id };
      prisma.kpi_snapshot.findMany.mockResolvedValue([mockKpiSnapshot]);

      await kpiSnapshotRepository.findMany(filters);

      expect(prisma.kpi_snapshot.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null, ...filters },
        skip: 0,
        take: 20,
        orderBy: { created_at: 'desc' },
        include: {}
      });
    });
  });

  describe('count', () => {
    it('should count KPI snapshots', async () => {
      prisma.kpi_snapshot.count.mockResolvedValue(10);

      const result = await kpiSnapshotRepository.count();

      expect(result).toBe(10);
    });
  });

  describe('create', () => {
    it('should create KPI snapshot', async () => {
      const createData = {
        tenant_id: mockKpiSnapshot.tenant_id,
        name: mockKpiSnapshot.name,
        value: mockKpiSnapshot.value
      };
      prisma.kpi_snapshot.create.mockResolvedValue(mockKpiSnapshot);

      const result = await kpiSnapshotRepository.create(createData);

      expect(result).toEqual(mockKpiSnapshot);
    });
  });

  describe('update', () => {
    it('should update KPI snapshot', async () => {
      const updateData = { value: '15000.00' };
      const updated = { ...mockKpiSnapshot, ...updateData };
      prisma.kpi_snapshot.update.mockResolvedValue(updated);

      const result = await kpiSnapshotRepository.update(mockKpiSnapshot.id, updateData);

      expect(result).toEqual(updated);
    });
  });

  describe('softDelete', () => {
    it('should soft delete KPI snapshot', async () => {
      const deleted = { ...mockKpiSnapshot, deleted_at: new Date() };
      prisma.kpi_snapshot.update.mockResolvedValue(deleted);

      const result = await kpiSnapshotRepository.softDelete(mockKpiSnapshot.id);

      expect(result.deleted_at).toBeTruthy();
    });
  });
});
