import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadAssignedGroupsByProduct: vi.fn(),
  validateOrderItemOptionsForProduct: vi.fn(),
  loadDefaultKitchenPrinterSnapshot: vi.fn(),
  loadKitchenPrinterSnapshotsByProduct: vi.fn(),
  getPrintPickupSlipFlags: vi.fn(),
  orderCreate: vi.fn(),
  orderItemCreate: vi.fn(),
  orderItemOptionCreateMany: vi.fn(),
  subBillCreate: vi.fn(),
  orderDelete: vi.fn(),
  logTransaction: vi.fn(),
  logAction: vi.fn(),
  dispatchKitchen: vi.fn(),
  pool: {},
}));

vi.mock('../../db/pool', () => ({
  pool: mocks.pool,
}));

vi.mock('../../models', () => ({
  OrderModel: {
    create: mocks.orderCreate,
    delete: mocks.orderDelete,
  },
  OrderItemModel: { create: mocks.orderItemCreate },
  SubBillModel: { create: mocks.subBillCreate },
}));

vi.mock('../../models/database/productModel', () => ({
  ProductModel: { getPrintPickupSlipFlags: mocks.getPrintPickupSlipFlags },
}));

vi.mock('../../models/database/orderItemOptionModel', () => ({
  OrderItemOptionModel: { createMany: mocks.orderItemOptionCreateMany },
}));

vi.mock('../../models/auditTrail', () => ({
  AuditTrailModel: { logAction: mocks.logAction },
}));

vi.mock('../../models/legalJournal', () => ({
  default: { logTransaction: mocks.logTransaction },
}));

vi.mock('../productOptions/productOptionValidationService', () => ({
  loadAssignedGroupsByProduct: mocks.loadAssignedGroupsByProduct,
  validateOrderItemOptionsForProduct: mocks.validateOrderItemOptionsForProduct,
}));

vi.mock('../productOptions/lineItemNote', () => ({
  AD_HOC_LINE_NOTE_GROUP_NAME: 'Note ligne',
}));

vi.mock('../kitchenPrinting/kitchenPrinterSnapshot', () => ({
  loadDefaultKitchenPrinterSnapshot: mocks.loadDefaultKitchenPrinterSnapshot,
  loadKitchenPrinterSnapshotsByProduct: mocks.loadKitchenPrinterSnapshotsByProduct,
}));

vi.mock('../kitchenPrinting/kitchenTicketDispatchService', () => ({
  dispatchKitchenTicketsForCompletedOrder: mocks.dispatchKitchen,
}));

vi.mock('../auth/actorContext', () => ({
  actorTrace: (actor: unknown) => ({ traced: actor }),
}));

import { createOrderWithCompliance } from './orderCreationService';

describe('createOrderWithCompliance', () => {
  const logger = { error: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadAssignedGroupsByProduct.mockResolvedValue(new Map());
    mocks.loadKitchenPrinterSnapshotsByProduct.mockResolvedValue(new Map());
    mocks.getPrintPickupSlipFlags.mockResolvedValue(new Map());
    mocks.loadDefaultKitchenPrinterSnapshot.mockResolvedValue(null);
    mocks.validateOrderItemOptionsForProduct.mockReturnValue({
      ok: true,
      value: { snapshots: [] },
    });
    mocks.orderCreate.mockResolvedValue({
      id: 42,
      total_amount: 11,
      total_tax: 1,
      payment_method: 'card',
      created_at: new Date('2026-01-01T12:00:00Z'),
    });
    mocks.orderItemCreate.mockResolvedValue({
      id: 1,
      product_name: 'Café',
      total_price: 11,
      tax_amount: 1,
    });
    mocks.orderItemOptionCreateMany.mockResolvedValue([]);
    mocks.logAction.mockResolvedValue(undefined);
  });

  it('returns 400 when option validation fails', async () => {
    mocks.validateOrderItemOptionsForProduct.mockReturnValue({
      ok: false,
      error: 'Option manquante',
    });

    const result = await createOrderWithCompliance(
      {
        payment_method: 'card',
        status: 'completed',
        items: [
          {
            product_id: 1,
            product_name: 'Café',
            quantity: 1,
            unit_price: 11,
            total_price: 11,
            tax_rate: 0.1,
            tax_amount: 1,
          },
        ],
      },
      { establishmentId: 'est-1' },
      logger
    );

    expect(result).toEqual({ ok: false, error: 'Option manquante', status: 400 });
    expect(mocks.orderCreate).not.toHaveBeenCalled();
  });

  it('creates a completed order, journals, and dispatches kitchen tickets', async () => {
    mocks.logTransaction.mockResolvedValue(undefined);

    const result = await createOrderWithCompliance(
      {
        payment_method: 'card',
        status: 'completed',
        items: [
          {
            product_id: 1,
            product_name: 'Café',
            quantity: 1,
            unit_price: 11,
            total_price: 11,
            tax_rate: 0.1,
            tax_amount: 1,
          },
        ],
      },
      { establishmentId: 'est-1', userId: '7' },
      logger
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order.id).toBe(42);
      expect(result.items).toHaveLength(1);
    }
    expect(mocks.logTransaction).toHaveBeenCalled();
    expect(mocks.dispatchKitchen).toHaveBeenCalled();
  });

  it('aborts and deletes the order when journal write fails', async () => {
    mocks.logTransaction.mockRejectedValue(new Error('journal down'));
    mocks.orderDelete.mockResolvedValue(true);

    const result = await createOrderWithCompliance(
      {
        payment_method: 'cash',
        status: 'completed',
        items: [
          {
            product_name: 'Eau',
            quantity: 1,
            unit_price: 2,
            total_price: 2,
            tax_rate: 0.1,
            tax_amount: 0.2,
          },
        ],
      },
      { establishmentId: 'est-1', userId: '7' },
      logger
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('legal journal');
    }
    expect(mocks.orderDelete).toHaveBeenCalledWith(42, 'est-1');
    expect(logger.error).toHaveBeenCalled();
  });

  it('creates split sub-bills when payment_method is split', async () => {
    mocks.subBillCreate.mockResolvedValue({ id: 1, amount: 5 });

    const result = await createOrderWithCompliance(
      {
        payment_method: 'split',
        status: 'pending',
        items: [
          {
            product_name: 'Plat',
            quantity: 1,
            unit_price: 10,
            total_price: 10,
            tax_rate: 0.1,
            tax_amount: 1,
          },
        ],
        sub_bills: [
          { payment_method: 'card', amount: 5 },
          { payment_method: 'cash', amount: 5 },
        ],
      },
      { establishmentId: 'est-1' },
      logger
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.subBills).toHaveLength(2);
    }
    expect(mocks.logTransaction).not.toHaveBeenCalled();
  });
});
