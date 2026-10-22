import { listTimeEntries } from './timeEntryReadModel';
import type { UserHoursTotal } from './timeEntryTypes';

export async function totalsByUser(
  establishmentId: string,
  opts: { from: string; to: string; userId?: number }
): Promise<UserHoursTotal[]> {
  const entries = await listTimeEntries(establishmentId, opts);
  const fromMs = new Date(opts.from).getTime();
  const toMs = new Date(opts.to).getTime();
  const map = new Map<number, UserHoursTotal>();

  for (const entry of entries) {
    const start = Math.max(new Date(entry.clock_in_at).getTime(), fromMs);
    const endRaw = entry.clock_out_at
      ? new Date(entry.clock_out_at).getTime()
      : Date.now();
    const end = Math.min(endRaw, toMs);
    const duration = Math.max(0, end - start);
    const existing = map.get(entry.user_id);
    if (existing) {
      existing.total_ms += duration;
      existing.entry_count += 1;
    } else {
      map.set(entry.user_id, {
        user_id: entry.user_id,
        first_name: entry.first_name,
        last_name: entry.last_name,
        email: entry.email,
        total_ms: duration,
        entry_count: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    `${a.last_name || ''}${a.first_name || ''}`.localeCompare(
      `${b.last_name || ''}${b.first_name || ''}`,
      'fr'
    )
  );
}
