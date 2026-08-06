/**
 * Canonical business_type values stored in establishments.business_type
 * (DB check: valid_business_type).
 */
export const ESTABLISHMENT_BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'cafe', label: 'Café' },
  { value: 'retail', label: 'Commerce / Retail' },
  { value: 'other', label: 'Autre' },
] as const;

export type EstablishmentBusinessType = (typeof ESTABLISHMENT_BUSINESS_TYPES)[number]['value'];

const LABEL_ALIASES: Record<string, EstablishmentBusinessType> = {
  restaurant: 'restaurant',
  bar: 'bar',
  cafe: 'cafe',
  café: 'cafe',
  retail: 'retail',
  other: 'other',
  autre: 'other',
  bistro: 'restaurant',
  brasserie: 'restaurant',
  'fast food': 'other',
  'food truck': 'other',
  catering: 'other',
  'commerce / retail': 'retail',
};

/** Map UI / legacy labels to a DB-safe business_type. */
export function normalizeBusinessType(raw: string | undefined | null): EstablishmentBusinessType {
  const key = (raw ?? '').trim().toLowerCase();
  if (!key) return 'other';
  if ((['restaurant', 'bar', 'cafe', 'retail', 'other'] as string[]).includes(key)) {
    return key as EstablishmentBusinessType;
  }
  return LABEL_ALIASES[key] ?? 'other';
}

export function businessTypeLabel(value: string): string {
  const normalized = normalizeBusinessType(value);
  return ESTABLISHMENT_BUSINESS_TYPES.find((t) => t.value === normalized)?.label ?? value;
}
