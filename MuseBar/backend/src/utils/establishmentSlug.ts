/**
 * Establishment slug helpers for admin inbox addresses (slug@mosehxl.com).
 */

const SLUG_MAX = 48;

export function slugifyEstablishmentName(name: string): string {
  const base = String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/^[^a-z]+/, '')
    .slice(0, SLUG_MAX);
  return base.length > 0 ? base : 'etab';
}

export function isValidEstablishmentSlug(slug: string): boolean {
  return /^[a-z][a-z0-9]{0,63}$/.test(slug);
}
