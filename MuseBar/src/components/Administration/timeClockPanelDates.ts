/** Date helpers for Administration → Pointage period filters. */

export function startOfWeekIso(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.toISOString();
}

export function endOfWeekIso(): string {
  const d = new Date(startOfWeekIso());
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

export function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function endOfMonthIso(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}
