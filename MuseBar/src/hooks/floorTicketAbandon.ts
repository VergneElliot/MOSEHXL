import { PERMISSIONS } from '@mosehxl/types';
import type { OrderItem } from '../types';
import * as floorApi from '../services/api/floor';
import { cartHasValidatedTableLine } from './floorActiveTable';

const CANCEL_VALIDATED_COPY = {
  title: 'Abandon avec articles validés',
  description:
    'PIN autorisé à annuler / retourner : cette table a des articles déjà validés (cuisine).',
} as const;

/**
 * Abandon a table ticket. Draft-only is basic; validated lines need `orders_cancel` step-up.
 */
export async function abandonFloorTicket(input: {
  ticketId: number;
  pinToken: string;
  cart: OrderItem[];
  ensureIntervention: () => Promise<void>;
  ensureOrdersCancel: (
    permission: string,
    opts: { title: string; description: string }
  ) => Promise<unknown>;
}): Promise<void> {
  await input.ensureIntervention();
  if (cartHasValidatedTableLine(input.cart)) {
    await input.ensureOrdersCancel(PERMISSIONS.orders_cancel, { ...CANCEL_VALIDATED_COPY });
  }
  await floorApi.abandonTicket(input.ticketId, input.pinToken);
}
