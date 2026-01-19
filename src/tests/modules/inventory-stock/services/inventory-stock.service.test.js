/**
 * Inventory stock service tests
 * @module tests/modules/inventory-stock/services
 */

const inventoryStockService = require('../../../modules/inventory-stock/services/inventory-stock.service');
const inventoryStockRepository = require('../../../modules/inventory-stock/repositories/inventory-stock.repository');
const { createAuditLog } = require('@lib/audit');

jest.mock('../../../modules/inventory-stock/repositories/inventory-stock.repository');
jest.mock('@lib/audit');

describe('Inventory Stock Service', () => {
  const userId = 'user-123';
  const ipAddress = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockResolvedValue({});
  });

  const mockStock = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    inventory_item_id: '550e8400-e29b-41d4-a716-446655440001',
    quantity: 100,
    reorder_level: 10
  };

  describe('listInventoryStocks', () => {
    it('should list inventory stocks with pagination', async () => {
      inventoryStockRepository.findMany.mockResolvedValue([mockStock]);
      inventoryStockRepository.count.mockResolvedValue(1);

      const result = await inventoryStockService.listInventoryStocks({}, 1, 20, 'created_at', 'desc', userId, ipAddress);

      expect(result.inventoryStocks).toEqual([mockStock]);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getInventoryStockById', () => {
    it('should get inventory stock by id', async () => {
      inventoryStockRepository.findById.mockResolvedValue(mockStock);
      const result = await inventoryStockService.getInventoryStockById(mockStock.id, userId, ipAddress);
      expect(result).toEqual(mockStock);
    });
  });

  describe('createInventoryStock', () => {
    it('should create inventory stock and log audit', async () => {
      inventoryStockRepository.create.mockResolvedValue(mockStock);
      const result = await inventoryStockService.createInventoryStock(mockStock, userId, ipAddress);
      expect(result).toEqual(mockStock);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });

  describe('updateInventoryStock', () => {
    it('should update inventory stock and log audit', async () => {
      inventoryStockRepository.findById.mockResolvedValue(mockStock);
      inventoryStockRepository.update.mockResolvedValue(mockStock);
      const result = await inventoryStockService.updateInventoryStock(mockStock.id, { quantity: 150 }, userId, ipAddress);
      expect(result).toEqual(mockStock);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });

  describe('deleteInventoryStock', () => {
    it('should delete inventory stock and log audit', async () => {
      inventoryStockRepository.findById.mockResolvedValue(mockStock);
      inventoryStockRepository.softDelete.mockResolvedValue(undefined);
      await inventoryStockService.deleteInventoryStock(mockStock.id, userId, ipAddress);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });
});
