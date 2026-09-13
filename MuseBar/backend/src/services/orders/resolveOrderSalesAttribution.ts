/**
 * Sales attribution for createOrder (informative Z / Total comptoir).
 * - Table: trust body owner snapshot.
 * - Comptoir + PIN: attribute to PIN identity (individual Z).
 * - Comptoir without PIN: null waiter → Total comptoir (bar caisse).
 */
export function resolveOrderSalesAttribution(input: {
  tableLabel: string | null;
  bodyWaiterUserId: unknown;
  bodyWaiterDisplayName: unknown;
  pinActor: { id: number; display_name: string } | null | undefined;
}): {
  table_label: string | null;
  waiter_user_id: number | null;
  waiter_display_name: string | null;
} {
  const { tableLabel, pinActor } = input;
  if (tableLabel == null) {
    if (pinActor) {
      return {
        table_label: null,
        waiter_user_id: pinActor.id,
        waiter_display_name: pinActor.display_name,
      };
    }
    return {
      table_label: null,
      waiter_user_id: null,
      waiter_display_name: null,
    };
  }
  return {
    table_label: tableLabel,
    waiter_user_id:
      input.bodyWaiterUserId != null ? Number(input.bodyWaiterUserId) : null,
    waiter_display_name:
      typeof input.bodyWaiterDisplayName === 'string'
        ? input.bodyWaiterDisplayName
        : null,
  };
}
