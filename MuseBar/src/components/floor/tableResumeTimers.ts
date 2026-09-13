import type { OpenTicketItemDto } from '../../services/api/floor';

/** GET ticket returns SELECT *; created_at is present even if the shared DTO omits it. */
export type ResumeTicketItem = OpenTicketItemDto & {
  created_at?: string | null;
};

export type LineResumeStatus = 'draft' | 'validated' | 'cancelled';

export function formatElapsedFr(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec} s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const remMin = min % 60;
  if (h < 48) {
    return remMin > 0 ? `${h} h ${String(remMin).padStart(2, '0')}` : `${h} h`;
  }
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return remH > 0 ? `${d} j ${remH} h` : `${d} j`;
}

export function elapsedSince(iso: string | null | undefined, nowMs: number): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  return formatElapsedFr(nowMs - t);
}

export function resolveLineStatus(item: ResumeTicketItem): LineResumeStatus {
  if (item.line_status === 'cancelled') return 'cancelled';
  if (item.line_status === 'validated') return 'validated';
  return 'draft';
}

export function lineStatusLabel(status: LineResumeStatus): string {
  if (status === 'validated') return 'Validée';
  if (status === 'cancelled') return 'Annulée';
  return 'Non validé';
}

/** Chip color aligned with POS line status cues. */
export function lineStatusChipColor(
  status: LineResumeStatus
): 'default' | 'warning' | 'success' {
  if (status === 'validated') return 'success';
  if (status === 'cancelled') return 'default';
  return 'warning';
}

export function lineAgeLabel(item: ResumeTicketItem, nowMs: number): string {
  const status = resolveLineStatus(item);
  if (status === 'cancelled') return 'Annulée';
  if (status === 'validated') {
    return `Validée depuis ${elapsedSince(item.validated_at ?? null, nowMs)}`;
  }
  return `Non validé depuis ${elapsedSince(item.created_at ?? null, nowMs)}`;
}

export function summarizeResumeLines(items: ResumeTicketItem[]): {
  draftCount: number;
  validatedCount: number;
  activeTotalTtc: number;
} {
  let draftCount = 0;
  let validatedCount = 0;
  let activeTotalTtc = 0;
  for (const item of items) {
    const status = resolveLineStatus(item);
    if (status === 'cancelled') continue;
    if (status === 'validated') validatedCount += 1;
    else draftCount += 1;
    activeTotalTtc += Number(item.total_price) || 0;
  }
  return { draftCount, validatedCount, activeTotalTtc };
}
