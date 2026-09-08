import type { OrderItem } from '../../models/interfaces';
import LegalJournalModel from '../../models/legalJournal';
import { AuditTrailModel } from '../../models/auditTrail';
import { AppError } from '../../middleware/errorHandler';
import { Logger } from '../../utils/logger';
import type { ActorContext } from '../auth/actorContext';
import { actorTrace } from '../auth/actorContext';

const logger = Logger.getInstance();

type CancellationType = 'full' | 'partial' | 'items-only';

/**
 * Journal + audit writes for cancellations. Kept out of `orderCancellationService` so that
 * file does not grow, and so every compensating entry can carry the same account + PIN pair
 * that SALE already records.
 */
export async function journalChangeCancellation(input: {
  establishmentId: string;
  orderId: number;
  amount: number;
  userId?: string;
  actor?: ActorContext | null;
}): Promise<void> {
  try {
    await LegalJournalModel.logChange(
      input.establishmentId,
      input.orderId,
      input.amount,
      input.userId,
      input.actor ? actorTrace(input.actor) : null
    );
  } catch (journalError) {
    logger.error(
      `Legal journal error (change cancellation) for order ${input.orderId}`,
      journalError instanceof Error ? journalError : new Error(String(journalError)),
      'LEGAL_JOURNAL'
    );
    throw new AppError(
      'Failed to persist legal journal entry for change cancellation',
      500,
      'ORDER_CANCEL_CHANGE_JOURNAL_FAILED'
    );
  }
}

export async function journalTipReversal(input: {
  establishmentId: string;
  orderId: number;
  amount: number;
  userId?: string;
  actor?: ActorContext | null;
}): Promise<void> {
  try {
    await LegalJournalModel.logChange(
      input.establishmentId,
      input.orderId,
      input.amount,
      input.userId,
      input.actor ? actorTrace(input.actor) : null
    );
  } catch (journalError) {
    logger.error(
      `Legal journal error (tip reversal) for order ${input.orderId}`,
      journalError instanceof Error ? journalError : new Error(String(journalError)),
      'LEGAL_JOURNAL'
    );
    throw new AppError(
      'Failed to persist legal journal entry for tip reversal',
      500,
      'ORDER_CANCEL_TIP_REVERSAL_JOURNAL_FAILED'
    );
  }
}

export async function journalOrderCancellation(input: {
  establishmentId: string;
  cancellationOrderId: number;
  originalOrderId: number;
  cancellationType: CancellationType;
  reason: string;
  cancellationAmount: number;
  cancellationTax: number;
  paymentMethod: string;
  cancelledItems: OrderItem[];
  userId?: string;
  actor?: ActorContext | null;
}): Promise<void> {
  try {
    await LegalJournalModel.addEntry(
      input.establishmentId,
      'REFUND',
      input.cancellationOrderId,
      -input.cancellationAmount,
      -input.cancellationTax,
      input.paymentMethod,
      {
        type: 'ORDER_CANCELLATION',
        cancellation_type: input.cancellationType,
        reason: input.reason,
        original_order_id: input.originalOrderId,
        cancelled_items: input.cancelledItems.map((item) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          total_price: item.total_price,
        })),
        total_cancelled: -input.cancellationAmount,
        tax_cancelled: -input.cancellationTax,
        ...(input.actor ? { actor: actorTrace(input.actor) } : {}),
      },
      input.userId
    );
  } catch (journalError) {
    logger.error(
      `Legal journal error (cancellation) for order ${input.cancellationOrderId}`,
      journalError instanceof Error ? journalError : new Error(String(journalError)),
      'LEGAL_JOURNAL'
    );
    throw new AppError(
      'Failed to persist legal journal entry for order cancellation',
      500,
      'ORDER_CANCEL_JOURNAL_FAILED'
    );
  }
}

export function auditChangeCancellation(input: {
  userId?: string;
  actor?: ActorContext | null;
  reversalOrderId: number;
  originalOrderId: number;
  amount: number;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}): void {
  AuditTrailModel.logAction({
    user_id: input.userId,
    pin_user_id: input.actor?.pinUserId ?? null,
    session_id: input.actor?.pinSessionId ?? undefined,
    action_type: 'CASH_REGISTER_CHANGE_CANCELLED',
    resource_type: 'ORDER',
    resource_id: String(input.reversalOrderId),
    action_details: {
      original_order_id: input.originalOrderId,
      amount: input.amount,
      reason: input.reason,
      ...(input.actor ? { actor: actorTrace(input.actor) } : {}),
    },
    ip_address: input.ipAddress,
    user_agent: input.userAgent,
    establishment_id: input.actor?.establishmentId ?? undefined,
  }).catch((auditError: unknown) => {
    logger.error(
      `Audit log error (change cancellation) for order ${input.reversalOrderId}`,
      auditError instanceof Error ? auditError : new Error(String(auditError)),
      'AUDIT_TRAIL'
    );
  });
}

export async function auditOrderCancellation(input: {
  userId?: string;
  actor?: ActorContext | null;
  cancellationOrderId: number;
  originalOrderId: number;
  cancellationType: CancellationType;
  reason: string;
  cancelledItems: OrderItem[];
  cancellationAmount: number;
  performedByDisplayName?: string;
  attributedWaiterUserId: number | null;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await AuditTrailModel.logAction({
      user_id: input.userId,
      pin_user_id: input.actor?.pinUserId ?? null,
      session_id: input.actor?.pinSessionId ?? undefined,
      action_type: 'CANCEL_ORDER',
      resource_type: 'ORDER',
      resource_id: String(input.cancellationOrderId),
      action_details: {
        original_order_id: input.originalOrderId,
        cancellation_type: input.cancellationType,
        reason: input.reason,
        cancelled_items: input.cancelledItems,
        cancellation_amount: -input.cancellationAmount,
        performed_by_user_id: input.userId ?? null,
        performed_by_display_name: input.performedByDisplayName ?? null,
        attributed_waiter_user_id: input.attributedWaiterUserId,
        ...(input.actor ? { actor: actorTrace(input.actor) } : {}),
      },
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
      establishment_id: input.actor?.establishmentId ?? undefined,
    });
  } catch (auditError) {
    logger.error(
      `Audit log error (cancellation) for order ${input.cancellationOrderId}`,
      auditError instanceof Error ? auditError : new Error(String(auditError)),
      'AUDIT_TRAIL'
    );
  }
}
