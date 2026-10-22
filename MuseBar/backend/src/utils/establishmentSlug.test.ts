import { describe, expect, it } from 'vitest';
import { isValidEstablishmentSlug, slugifyEstablishmentName } from './establishmentSlug';

describe('establishmentSlug', () => {
  it('slugifies names by stripping accents and non-alnum', () => {
    expect(slugifyEstablishmentName('Café de l’Été')).toBe('cafedelete');
    expect(slugifyEstablishmentName('123 Bar')).toBe('bar');
    expect(slugifyEstablishmentName('@@@')).toBe('etab');
  });

  it('validates slug shape', () => {
    expect(isValidEstablishmentSlug('muse')).toBe(true);
    expect(isValidEstablishmentSlug('m1')).toBe(true);
    expect(isValidEstablishmentSlug('1bad')).toBe(false);
    expect(isValidEstablishmentSlug('Bad')).toBe(false);
    expect(isValidEstablishmentSlug('')).toBe(false);
  });
});
