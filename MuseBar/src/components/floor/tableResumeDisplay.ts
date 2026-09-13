import type { ResumeTicketItem } from './tableResumeTimers';
import { elapsedSince } from './tableResumeTimers';

/** Consult display for Plan de salle resume (includes service fulfillment). */
export type ResumeDisplayStatus =
  | 'draft'
  | 'validated'
  | 'sent'
  | 'served'
  | 'cancelled';

export function resolveResumeDisplayStatus(item: ResumeTicketItem): ResumeDisplayStatus {
  if (item.line_status === 'cancelled') return 'cancelled';
  if (item.line_status !== 'validated') return 'draft';
  if (item.served_at != null) return 'served';
  if (item.kitchen_sent_at != null) return 'sent';
  return 'validated';
}

export function resumeStatusLabel(status: ResumeDisplayStatus): string {
  switch (status) {
    case 'validated':
      return 'Validé';
    case 'sent':
      return 'Envoyé';
    case 'served':
      return 'Servi';
    case 'cancelled':
      return 'Annulée';
    case 'draft':
    default:
      return 'Non validé';
  }
}

export function resumeStatusChipColor(
  status: ResumeDisplayStatus
): 'default' | 'warning' | 'success' | 'info' | 'secondary' {
  switch (status) {
    case 'validated':
      return 'success';
    case 'sent':
      return 'info';
    case 'served':
      return 'secondary';
    case 'cancelled':
      return 'default';
    case 'draft':
    default:
      return 'warning';
  }
}

export function resumeStepTimestamp(
  item: ResumeTicketItem,
  status: ResumeDisplayStatus
): string | null {
  switch (status) {
    case 'served':
      return item.served_at ?? null;
    case 'sent':
      return item.kitchen_sent_at ?? null;
    case 'validated':
      return item.validated_at ?? null;
    case 'cancelled':
      return null;
    case 'draft':
    default:
      return item.created_at ?? null;
  }
}

export function resumeAgeLabel(
  status: ResumeDisplayStatus,
  stepIso: string | null,
  nowMs: number
): string {
  if (status === 'cancelled') return 'Annulée';
  const since = elapsedSince(stepIso, nowMs);
  switch (status) {
    case 'served':
      return `Servi depuis ${since}`;
    case 'sent':
      return `Envoyé depuis ${since}`;
    case 'validated':
      return `Validé depuis ${since}`;
    case 'draft':
    default:
      return `Non validé depuis ${since}`;
  }
}

/** Unit quantities for hospitality lines — never show `1.000×`. */
export function formatResumeQty(quantity: number): string {
  const n = Number(quantity);
  if (!Number.isFinite(n)) return '0×';
  return `${Math.round(n)}×`;
}

function optionsKey(options: unknown): string {
  try {
    return JSON.stringify(options ?? null);
  } catch {
    return String(options);
  }
}

export function resumeGroupKey(item: ResumeTicketItem): string {
  const status = resolveResumeDisplayStatus(item);
  return [
    item.product_id ?? 'null',
    item.product_name,
    Number(item.unit_price),
    item.happy_hour_applied ? '1' : '0',
    item.is_manual_happy_hour ? '1' : '0',
    item.description ?? '',
    optionsKey(item.options_json),
    status,
  ].join('\u001f');
}

export type ResumeGroupedLine = {
  key: string;
  product_name: string;
  quantity: number;
  total_price: number;
  status: ResumeDisplayStatus;
  stepIso: string | null;
  sort_order: number;
  muted: boolean;
};

function earlierIso(a: string | null, b: string | null): string | null {
  if (a == null) return b;
  if (b == null) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

/** Group identical products that share the same display status (consult view). */
export function groupResumeLines(items: ResumeTicketItem[]): ResumeGroupedLine[] {
  const map = new Map<string, ResumeGroupedLine>();
  for (const item of items) {
    const status = resolveResumeDisplayStatus(item);
    const key = resumeGroupKey(item);
    const stepIso = resumeStepTimestamp(item, status);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        product_name: item.product_name,
        quantity: Number(item.quantity) || 0,
        total_price: Number(item.total_price) || 0,
        status,
        stepIso,
        sort_order: Number(item.sort_order) || 0,
        muted: status === 'cancelled',
      });
      continue;
    }
    existing.quantity += Number(item.quantity) || 0;
    existing.total_price += Number(item.total_price) || 0;
    existing.stepIso = earlierIso(existing.stepIso, stepIso);
    existing.sort_order = Math.min(existing.sort_order, Number(item.sort_order) || 0);
  }
  return [...map.values()].sort((a, b) => a.sort_order - b.sort_order || a.key.localeCompare(b.key));
}

export function summarizeResumeDisplay(items: ResumeTicketItem[]): {
  draftCount: number;
  validatedCount: number;
  sentCount: number;
  servedCount: number;
  activeTotalTtc: number;
} {
  let draftCount = 0;
  let validatedCount = 0;
  let sentCount = 0;
  let servedCount = 0;
  let activeTotalTtc = 0;
  for (const item of items) {
    const status = resolveResumeDisplayStatus(item);
    if (status === 'cancelled') continue;
    activeTotalTtc += Number(item.total_price) || 0;
    if (status === 'draft') draftCount += 1;
    else if (status === 'validated') validatedCount += 1;
    else if (status === 'sent') sentCount += 1;
    else if (status === 'served') servedCount += 1;
  }
  return { draftCount, validatedCount, sentCount, servedCount, activeTotalTtc };
}
