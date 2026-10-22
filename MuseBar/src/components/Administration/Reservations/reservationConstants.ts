export function localDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const STATUSES = [
  { id: 'requested', label: 'Demandée' },
  { id: 'on_hold', label: 'En attente' },
  { id: 'confirmed', label: 'Confirmée' },
  { id: 'refused', label: 'Refusée' },
  { id: 'seated', label: 'Installée' },
  { id: 'no_show', label: 'No-show' },
  { id: 'cancelled', label: 'Annulée' },
];

export const STATUS_COLOR: Record<string, string> = {
  confirmed: '#2e7d32',
  requested: '#0288d1',
  on_hold: '#ed6c02',
  refused: '#c62828',
  seated: '#6a1b9a',
  no_show: '#c62828',
  cancelled: '#757575',
};

export type StatusChipColor =
  | 'default'
  | 'success'
  | 'info'
  | 'error'
  | 'secondary'
  | 'warning';

export function statusColor(status: string): StatusChipColor {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'requested':
      return 'info';
    case 'on_hold':
      return 'warning';
    case 'refused':
    case 'no_show':
      return 'error';
    case 'cancelled':
      return 'default';
    case 'seated':
      return 'secondary';
    default:
      return 'default';
  }
}
