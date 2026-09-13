import type { OngoingOrderItemDto } from '../../services/api/floorOngoingOrders';
import { elapsedSince } from '../floor/tableResumeTimers';

export type ServiceFulfillmentStatus = OngoingOrderItemDto['fulfillment_status'];

export function fulfillmentLabel(status: ServiceFulfillmentStatus): string {
  switch (status) {
    case 'validated':
      return 'Validé';
    case 'sent':
      return 'Envoyé';
    case 'served':
      return 'Servi';
    default:
      return status;
  }
}

export function fulfillmentColor(
  status: ServiceFulfillmentStatus
): 'default' | 'info' | 'success' | 'secondary' {
  switch (status) {
    case 'validated':
      return 'success';
    case 'sent':
      return 'info';
    case 'served':
      return 'secondary';
    default:
      return 'default';
  }
}

/** Age since the timestamp that opened the current fulfillment step. */
export function fulfillmentAgeLabel(item: OngoingOrderItemDto, nowMs: number): string {
  switch (item.fulfillment_status) {
    case 'served':
      return `Servi depuis ${elapsedSince(item.served_at, nowMs)}`;
    case 'sent':
      return `Envoyé depuis ${elapsedSince(item.kitchen_sent_at, nowMs)}`;
    case 'validated':
    default:
      return `Validé depuis ${elapsedSince(item.validated_at, nowMs)}`;
  }
}

export function nextFulfillmentAction(
  status: ServiceFulfillmentStatus
): { target: 'sent' | 'served'; label: string } | null {
  if (status === 'validated') return { target: 'sent', label: 'Marquer envoyé' };
  if (status === 'sent') return { target: 'served', label: 'Marquer servi' };
  return null;
}
