import { formatDate } from '../../utils/formatDate';

export type ClosureType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
export type DailyClosureMode = 'business_day' | 'close_now';

export type DailyClosurePreview =
  | {
      ok: true;
      period_start: string;
      period_end: string;
      total_transactions: number;
      total_amount: number;
    }
  | { ok: false; reason: string };

export interface CreateClosurePayload {
  date: string;
  type: ClosureType;
  force?: boolean;
  fond_de_caisse: number;
  email_recipients?: string[];
  mode?: DailyClosureMode;
}

export function formatPeriodBound(iso: string): string {
  const formatted = formatDate(iso);
  return formatted === 'N/A' ? iso : formatted;
}

export function parseEmailRecipients(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseFondDeCaisse(raw: string): number | null {
  const n = parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
