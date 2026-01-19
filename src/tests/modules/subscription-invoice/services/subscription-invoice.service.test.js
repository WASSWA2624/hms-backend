/**
 * Subscription Invoice service tests
 *
 * @module tests/modules/subscription-invoice/services
 * @description Tests for subscription invoice business logic layer
 */

const subscriptionInvoiceService = require('../../../../modules/subscription-invoice/services/subscription-invoice.service');
const subscriptionInvoiceRepository = require('../../../../modules/subscription-invoice/repositories/subscription-invoice.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

jest.mock('../../../../modules/subscription-invoice/repositories/subscription-invoice.repository');
jest.mock('@lib/audit');

describe('Subscription Invoice Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubscriptionInvoiceById', () => {
    it('should get subscription invoice by ID', async () => {
      const mockInvoice = { id: '123', subscription_id: '456', invoice_id: '789' };
      subscriptionInvoiceRepository.findById.mockResolvedValue(mockInvoice);

      const result = await subscriptionInvoiceService.getSubscriptionInvoiceById('123');

      expect(result).toEqual(mockInvoice);
      expect(subscriptionInvoiceRepository.findById).toHaveBeenCalledWith('123', {
        subscription: true,
        invoice: true
      });
    });

    it('should throw HttpError when not found', async () => {
      subscriptionInvoiceRepository.findById.mockResolvedValue(null);

      await expect(subscriptionInvoiceService.getSubscriptionInvoiceById('999')).rejects.toThrow(HttpError);
    });
  });

  describe('listSubscriptionInvoices', () => {
    it('should list subscription invoices with pagination', async () => {
      const mockInvoices = [{ id: '1' }, { id: '2' }];
      subscriptionInvoiceRepository.findMany.mockResolvedValue(mockInvoices);
      subscriptionInvoiceRepository.count.mockResolvedValue(10);

      const result = await subscriptionInvoiceService.listSubscriptionInvoices({}, 1, 20);

      expect(result.subscriptionInvoices).toEqual(mockInvoices);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should apply subscription_id filter', async () => {
      subscriptionInvoiceRepository.findMany.mockResolvedValue([]);
      subscriptionInvoiceRepository.count.mockResolvedValue(0);

      await subscriptionInvoiceService.listSubscriptionInvoices({ subscription_id: '456' }, 1, 20);

      expect(subscriptionInvoiceRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_id: '456'
        }),
        0,
        20,
        { created_at: 'desc' },
        expect.any(Object)
      );
    });

    it('should apply invoice_id filter', async () => {
      subscriptionInvoiceRepository.findMany.mockResolvedValue([]);
      subscriptionInvoiceRepository.count.mockResolvedValue(0);

      await subscriptionInvoiceService.listSubscriptionInvoices({ invoice_id: '789' }, 1, 20);

      expect(subscriptionInvoiceRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          invoice_id: '789'
        }),
        0,
        20,
        { created_at: 'desc' },
        expect.any(Object)
      );
    });
  });

  describe('createSubscriptionInvoice', () => {
    it('should create subscription invoice and audit log', async () => {
      const mockData = { subscription_id: '456', invoice_id: '789' };
      const mockCreated = { id: '123', ...mockData };
      subscriptionInvoiceRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockResolvedValue({});

      const result = await subscriptionInvoiceService.createSubscriptionInvoice(
        mockData,
        { id: 'user123' },
        '127.0.0.1'
      );

      expect(result).toEqual(mockCreated);
      expect(subscriptionInvoiceRepository.create).toHaveBeenCalledWith(mockData);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity: 'subscription_invoice',
          entity_id: '123'
        })
      );
    });

    it('should handle audit log failure gracefully', async () => {
      const mockData = { subscription_id: '456', invoice_id: '789' };
      const mockCreated = { id: '123', ...mockData };
      subscriptionInvoiceRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      const result = await subscriptionInvoiceService.createSubscriptionInvoice(mockData, {}, '127.0.0.1');

      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateSubscriptionInvoice', () => {
    it('should update subscription invoice and audit log', async () => {
      const mockBefore = { id: '123', subscription_id: '456', invoice_id: '789' };
      const mockAfter = { id: '123', subscription_id: '456', invoice_id: '999' };
      subscriptionInvoiceRepository.findById.mockResolvedValue(mockBefore);
      subscriptionInvoiceRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await subscriptionInvoiceService.updateSubscriptionInvoice(
        '123',
        { invoice_id: '999' },
        { id: 'user123' },
        '127.0.0.1'
      );

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entity: 'subscription_invoice',
          diff: { before: mockBefore, after: mockAfter }
        })
      );
    });
  });

  describe('deleteSubscriptionInvoice', () => {
    it('should soft delete subscription invoice and audit log', async () => {
      const mockBefore = { id: '123', deleted_at: null };
      const mockAfter = { id: '123', deleted_at: new Date() };
      subscriptionInvoiceRepository.findById.mockResolvedValue(mockBefore);
      subscriptionInvoiceRepository.softDelete.mockResolvedValue(mockAfter);
      createAuditLog.mockResolvedValue({});

      const result = await subscriptionInvoiceService.deleteSubscriptionInvoice(
        '123',
        { id: 'user123' },
        '127.0.0.1'
      );

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entity: 'subscription_invoice'
        })
      );
    });
  });
});
