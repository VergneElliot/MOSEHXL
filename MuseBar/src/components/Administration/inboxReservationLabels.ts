export const INBOX_RESERVATION_STATUS_LABEL: Record<string, string> = {
  requested: 'Demandée',
  on_hold: 'En attente',
  confirmed: 'Confirmée',
  refused: 'Refusée',
  cancelled: 'Annulée',
  seated: 'Installée',
  no_show: 'No-show',
};

export const INBOX_RESERVATION_ACTION_LABEL: Record<
  'confirmed' | 'on_hold' | 'refused',
  string
> = {
  confirmed: 'valider',
  on_hold: 'mettre en attente',
  refused: 'refuser',
};
