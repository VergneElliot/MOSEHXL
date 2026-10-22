import type { Order } from '../../models/interfaces';
import type { ActorContext } from '../auth/actorContext';

export type CancellationType = 'full' | 'partial' | 'items-only';

export type UnifiedCancellationRequest = {
  establishmentId: string;
  orderId: number;
  reason: string;
  cancellationType: CancellationType;
  itemsToCancel?: number[];
  includeTipReversal?: boolean;
  userId?: string;
  performedByDisplayName?: string;
  ipAddress?: string;
  userAgent?: string;
  /** Account + PIN pair that authorised the cancellation. */
  actor?: ActorContext | null;
};

export type UnifiedCancellationResponse = {
  status: number;
  body: Record<string, unknown>;
};

export function salesAttributionFromOrder(order: Order) {
  return {
    waiter_user_id: order.waiter_user_id ?? null,
    waiter_display_name: order.waiter_display_name ?? null,
    table_label: order.table_label ?? null,
  };
}

export function appendPerformedByNote(
  notes: string,
  performedBy?: { userId?: string; displayName?: string }
): string {
  if (!performedBy?.userId) return notes;
  const label = performedBy.displayName?.trim() || `user #${performedBy.userId}`;
  return `${notes} | Effectué par: ${label}`;
}
