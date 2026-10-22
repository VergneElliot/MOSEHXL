import {
  parisDateTimeLocalToUtcIso,
  utcToParisDateTimeLocal,
} from '../../../utils/formatDate';

export function msToDecimalHours(ms: number): number {
  return Math.round((ms / 3600000) * 100) / 100;
}

export function formatDecimalHoursFr(ms: number): string {
  return `${msToDecimalHours(ms).toFixed(2).replace('.', ',')} h`;
}

export function staffLabel(s: {
  first_name: string | null;
  last_name: string | null;
  email: string;
}) {
  const name = [s.first_name, s.last_name].filter(Boolean).join(' ').trim();
  return name || s.email;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function toLocalInputValue(iso: string | null | undefined): string {
  return utcToParisDateTimeLocal(iso);
}

export function fromLocalInputValue(local: string): string {
  return parisDateTimeLocalToUtcIso(local);
}
