/** Service-line fulfillment after validation: Validé → Envoyé → Servi. */

export type FulfillmentStatus = 'validated' | 'sent' | 'served';

export type FulfillmentTimestamps = {
  line_status: string;
  validated_at: Date | string | null;
  kitchen_sent_at: Date | string | null;
  served_at?: Date | string | null;
};

export function resolveFulfillmentStatus(item: FulfillmentTimestamps): FulfillmentStatus | 'draft' {
  if (item.line_status === 'draft') return 'draft';
  if (item.served_at != null) return 'served';
  if (item.kitchen_sent_at != null) return 'sent';
  return 'validated';
}

export function fulfillmentLabelFr(status: FulfillmentStatus | 'draft'): string {
  switch (status) {
    case 'draft':
      return 'Brouillon';
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
