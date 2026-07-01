import { pool } from '../../db/pool';
import { OrderItemModel, OrderModel, SubBillModel } from '../../models';
import { ProductModel } from '../../models/database/productModel';
import { OrderItemOptionModel, type OrderItemOptionSnapshotInput } from '../../models/database/orderItemOptionModel';
import { AuditTrailModel } from '../../models/auditTrail';
import type { Order } from '../../models/interfaces';
import LegalJournalModel from '../../models/legalJournal';
import {
  loadAssignedGroupsByProduct,
  validateOrderItemOptionsForProduct,
  type CreateOrderItemOptionInput,
} from '../productOptions/productOptionValidationService';
import {
  loadKitchenPrinterSnapshotsByProduct,
  type KitchenPrinterLineSnapshot,
} from '../kitchenPrinting/kitchenPrinterSnapshot';
import { dispatchKitchenTicketsForCompletedOrder } from '../kitchenPrinting/kitchenTicketDispatchService';

export interface CreateOrderItemInput {
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  happy_hour_applied?: boolean;
  happy_hour_discount_amount?: number;
  is_manual_happy_hour?: boolean;
  description?: string;
  options?: CreateOrderItemOptionInput[];
}

export interface CreateOrderSubBillInput {
  payment_method: string;
  amount: number;
}

export interface CreateOrderBodyInput {
  payment_method: Order['payment_method'];
  status: Order['status'];
  notes?: string;
  items: CreateOrderItemInput[];
  sub_bills?: CreateOrderSubBillInput[];
  tips?: number;
  change?: number;
}

export interface OrderCreationRequestContext {
  establishmentId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface OrderCreationLoggerLike {
  error: (message: string, error: Error, category?: string) => void;
}

export type OrderCreationResult =
  | {
      ok: true;
      order: Awaited<ReturnType<typeof OrderModel.create>>;
      items: Array<
        Awaited<ReturnType<typeof OrderItemModel.create>> & {
          options: Awaited<ReturnType<typeof OrderItemOptionModel.createMany>>;
        }
      >;
      subBills: Array<Awaited<ReturnType<typeof SubBillModel.create>>>;
    }
  | {
      ok: false;
      error: string;
      status?: number;
    };

export async function createOrderWithCompliance(
  body: CreateOrderBodyInput,
  context: OrderCreationRequestContext,
  logger: OrderCreationLoggerLike
): Promise<OrderCreationResult> {
  const { payment_method, status, notes, items, sub_bills, tips, change } = body;
  const { establishmentId, userId, ipAddress, userAgent } = context;

  const productIds = items
    .map((item) => item.product_id)
    .filter((id): id is number => id != null && Number.isInteger(id) && id > 0);
  const assignedGroupsByProduct = await loadAssignedGroupsByProduct(establishmentId, productIds);
  const kitchenPrintersByProduct = await loadKitchenPrinterSnapshotsByProduct(establishmentId, productIds);
  const printPickupSlipByProduct = await ProductModel.getPrintPickupSlipFlags(establishmentId, productIds);

  const validatedSnapshots: OrderItemOptionSnapshotInput[][] = [];
  for (const item of items) {
    const assignedGroups =
      item.product_id != null ? assignedGroupsByProduct.get(item.product_id) ?? [] : [];
    const validation = validateOrderItemOptionsForProduct(
      item.product_id,
      item.product_name,
      item.options,
      assignedGroups
    );
    if (!validation.ok) {
      return { ok: false, error: validation.error, status: 400 };
    }
    validatedSnapshots.push(validation.value.snapshots);
  }

  // Base TTC from items only — never include tips in total_amount (zero-sum for CA).
  const total_amount = items.reduce((sum, i) => sum + Number(i.total_price), 0);
  const total_tax = items.reduce((sum, i) => sum + Number(i.tax_amount), 0);

  const order = await OrderModel.create(
    {
      total_amount,
      total_tax,
      payment_method,
      status,
      notes: notes || '',
      tips: tips || 0,
      change: change || 0,
      establishment_id: establishmentId,
    },
    establishmentId
  );

  const createdItems = [];
  for (const [index, item] of items.entries()) {
    const kitchenPrinterSnapshot: KitchenPrinterLineSnapshot[] =
      item.product_id != null ? kitchenPrintersByProduct.get(item.product_id) ?? [] : [];
    const printPickupSlipSnapshot =
      item.product_id != null ? printPickupSlipByProduct.get(item.product_id) === true : false;
    const createdItem = await OrderItemModel.create(
      {
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        happy_hour_applied: item.happy_hour_applied || false,
        happy_hour_discount_amount: item.happy_hour_discount_amount || 0,
        is_manual_happy_hour: item.is_manual_happy_hour === true,
        description: item.description || '',
        kitchen_printer_ids_snapshot: kitchenPrinterSnapshot,
        print_pickup_slip_snapshot: printPickupSlipSnapshot,
      },
      establishmentId
    );
    const options = await OrderItemOptionModel.createMany(
      createdItem.id,
      establishmentId,
      validatedSnapshots[index] ?? []
    );
    createdItems.push({ ...createdItem, options });
  }

  let createdSubBills: Array<Awaited<ReturnType<typeof SubBillModel.create>>> = [];
  if (payment_method === 'split' && Array.isArray(sub_bills)) {
    createdSubBills = await Promise.all(
      sub_bills.map((sb) => {
        const method: 'cash' | 'card' = sb.payment_method === 'card' ? 'card' : 'cash';
        return SubBillModel.create(
          { order_id: order.id, payment_method: method, amount: sb.amount, status: 'pending' },
          establishmentId
        );
      })
    );
  }

  if (status === 'completed') {
    try {
      await LegalJournalModel.logTransaction(
        {
          id: order.id,
          establishment_id: establishmentId,
          total_amount: order.total_amount,
          total_tax: order.total_tax,
          payment_method: order.payment_method,
          items: createdItems.map((ci) => {
            const copy = { ...ci } as Record<string, unknown>;
            delete copy.options;
            delete copy.kitchen_printer_ids_snapshot;
            return copy;
          }),
          created_at: order.created_at,
        },
        userId
      );
    } catch (journalError: unknown) {
      logger.error(
        `Failed to write legal journal entry for order ${order.id}`,
        journalError instanceof Error ? journalError : new Error(String(journalError)),
        'LEGAL_JOURNAL'
      );
      try {
        const deleted = await OrderModel.delete(order.id, establishmentId);
        if (!deleted) {
          logger.error(
            `Compensating delete failed after legal journal failure for order ${order.id}`,
            new Error('ORDER_COMPENSATING_DELETE_FAILED'),
            'LEGAL_JOURNAL'
          );
        }
      } catch (cleanupError: unknown) {
        logger.error(
          `Compensating delete threw after legal journal failure for order ${order.id}`,
          cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)),
          'LEGAL_JOURNAL'
        );
      }
      return {
        ok: false,
        error: 'Failed to persist legal journal entry; order creation aborted for compliance safety',
      };
    }

    AuditTrailModel.logAction({
      user_id: userId,
      action_type: 'ORDER_CREATED',
      resource_type: 'ORDER',
      resource_id: String(order.id),
      action_details: {
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        item_count: createdItems.length,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    }).catch((auditError: unknown) => {
      logger.error(
        `Failed to write audit trail entry for order ${order.id}`,
        auditError instanceof Error ? auditError : new Error(String(auditError)),
        'AUDIT_TRAIL'
      );
    });

    void dispatchKitchenTicketsForCompletedOrder(pool, {
      establishmentId,
      order,
      items: createdItems,
      createdByUserId: userId != null ? Number(userId) : undefined,
      logger,
    });
  }

  return {
    ok: true,
    order,
    items: createdItems,
    subBills: createdSubBills,
  };
}
