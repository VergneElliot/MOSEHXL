export type TimeClockSource = 'self' | 'shared_terminal' | 'admin';

export interface TimeEntry {
  id: number;
  establishment_id: string;
  user_id: number;
  clock_in_at: string;
  clock_out_at: string | null;
  clock_in_ip: string | null;
  clock_out_ip: string | null;
  source: TimeClockSource;
  note: string | null;
  adjusted_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryWithUser extends TimeEntry {
  first_name: string | null;
  last_name: string | null;
  email: string;
}

export interface UserHoursTotal {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  total_ms: number;
  entry_count: number;
}

export function mapTimeEntryRow(row: Record<string, unknown>): TimeEntry {
  return {
    id: Number(row.id),
    establishment_id: String(row.establishment_id),
    user_id: Number(row.user_id),
    clock_in_at: new Date(row.clock_in_at as string | Date).toISOString(),
    clock_out_at: row.clock_out_at
      ? new Date(row.clock_out_at as string | Date).toISOString()
      : null,
    clock_in_ip: (row.clock_in_ip as string) ?? null,
    clock_out_ip: (row.clock_out_ip as string) ?? null,
    source: row.source as TimeClockSource,
    note: (row.note as string) ?? null,
    adjusted_by: row.adjusted_by != null ? Number(row.adjusted_by) : null,
    created_at: new Date(row.created_at as string | Date).toISOString(),
    updated_at: new Date(row.updated_at as string | Date).toISOString(),
  };
}

export function mapTimeEntryWithUser(row: Record<string, unknown>): TimeEntryWithUser {
  return {
    ...mapTimeEntryRow(row),
    first_name: (row.first_name as string | null) ?? null,
    last_name: (row.last_name as string | null) ?? null,
    email: String(row.email),
  };
}
