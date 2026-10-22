import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../middleware/errorHandler';
import {
  parseDailyClosureMode,
  parseForceFlag,
  parseFondDeCaisse,
  parseOptionalEmailRecipients,
} from './parsers';

describe('parseDailyClosureMode', () => {
  it('defaults null/empty to business_day', () => {
    expect(parseDailyClosureMode(null)).toBe('business_day');
    expect(parseDailyClosureMode(undefined)).toBe('business_day');
    expect(parseDailyClosureMode('')).toBe('business_day');
  });

  it('accepts business_day and close_now', () => {
    expect(parseDailyClosureMode('business_day')).toBe('business_day');
    expect(parseDailyClosureMode('close_now')).toBe('close_now');
  });

  it('throws ValidationError on invalid mode', () => {
    expect(() => parseDailyClosureMode('calendar_day')).toThrow(ValidationError);
    expect(() => parseDailyClosureMode('calendar_day')).toThrow(
      /mode must be business_day or close_now/
    );
  });
});

describe('parseForceFlag', () => {
  it('treats true and 1 as forced', () => {
    expect(parseForceFlag(true)).toBe(true);
    expect(parseForceFlag(1)).toBe(true);
  });

  it('parses common truthy strings (case-insensitive)', () => {
    expect(parseForceFlag('true')).toBe(true);
    expect(parseForceFlag(' TRUE ')).toBe(true);
    expect(parseForceFlag('1')).toBe(true);
    expect(parseForceFlag('on')).toBe(true);
    expect(parseForceFlag('yes')).toBe(true);
  });

  it('returns false for everything else', () => {
    expect(parseForceFlag(false)).toBe(false);
    expect(parseForceFlag(0)).toBe(false);
    expect(parseForceFlag('false')).toBe(false);
    expect(parseForceFlag('no')).toBe(false);
    expect(parseForceFlag(null)).toBe(false);
    expect(parseForceFlag(undefined)).toBe(false);
  });
});

describe('parseFondDeCaisse', () => {
  it('returns null for empty / invalid / negative', () => {
    expect(parseFondDeCaisse(null)).toBeNull();
    expect(parseFondDeCaisse(undefined)).toBeNull();
    expect(parseFondDeCaisse('')).toBeNull();
    expect(parseFondDeCaisse('abc')).toBeNull();
    expect(parseFondDeCaisse(NaN)).toBeNull();
    expect(parseFondDeCaisse(-1)).toBeNull();
  });

  it('parses finite non-negative numbers and numeric strings', () => {
    expect(parseFondDeCaisse(0)).toBe(0);
    expect(parseFondDeCaisse(50.5)).toBe(50.5);
    expect(parseFondDeCaisse('75')).toBe(75);
  });
});

describe('parseOptionalEmailRecipients', () => {
  it('returns empty for null/empty inputs', () => {
    expect(parseOptionalEmailRecipients(null)).toEqual([]);
    expect(parseOptionalEmailRecipients(undefined)).toEqual([]);
    expect(parseOptionalEmailRecipients('')).toEqual([]);
    expect(parseOptionalEmailRecipients('   ')).toEqual([]);
    expect(parseOptionalEmailRecipients([])).toEqual([]);
  });

  it('parses comma/semicolon/newline strings, lowercases, and dedupes', () => {
    expect(
      parseOptionalEmailRecipients('A@Example.com, b@example.com; A@example.com\nc@example.com')
    ).toEqual(['a@example.com', 'b@example.com', 'c@example.com']);
  });

  it('parses arrays of emails', () => {
    expect(parseOptionalEmailRecipients(['one@test.com', ' two@test.com '])).toEqual([
      'one@test.com',
      'two@test.com',
    ]);
  });

  it('throws ValidationError on invalid email', () => {
    expect(() => parseOptionalEmailRecipients('not-an-email')).toThrow(ValidationError);
    expect(() => parseOptionalEmailRecipients('not-an-email')).toThrow(
      /Adresse email destinataire invalide/
    );
    expect(() => parseOptionalEmailRecipients(['ok@test.com', 'bad'])).toThrow(ValidationError);
  });
});
