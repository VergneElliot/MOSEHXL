import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildDisplayName,
  pinActorHasPermission,
  signPinActorToken,
  verifyPinActorToken,
} from './pinActorToken';
import { MembershipPinModel } from '../../models/membershipPin';
import { signJwtToken } from '../../security/jwtConfig';

describe('pinActorToken', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-chars-long!!';
  });

  it('signs and verifies a pin actor token', () => {
    const token = signPinActorToken({
      id: 42,
      email: 'waiter@example.com',
      role: 'staff',
      establishment_id: '11111111-1111-1111-1111-111111111111',
      display_name: 'Alice',
      permissions: ['access_pos'],
    });
    const payload = verifyPinActorToken(token);
    expect(payload.id).toBe(42);
    expect(payload.token_use).toBe('pin_actor');
    expect(payload.permissions).toContain('access_pos');
  });

  it('rejects non pin-actor tokens', () => {
    const station = signJwtToken(
      {
        id: 1,
        email: 'a@b.c',
        role: 'establishment_admin',
        establishment_id: '11111111-1111-1111-1111-111111111111',
      },
      '15m'
    );
    expect(() => verifyPinActorToken(station)).toThrow(/pin actor/i);
  });

  it('buildDisplayName prefers full name', () => {
    expect(buildDisplayName('Ada', 'Lovelace', 'ada@x')).toBe('Ada Lovelace');
    expect(buildDisplayName(null, null, 'ada@x')).toBe('ada@x');
  });

  it('pinActorHasPermission treats establishment_admin as all-access', () => {
    expect(
      pinActorHasPermission(
        {
          token_use: 'pin_actor',
          id: 1,
          email: 'a@b.c',
          role: 'establishment_admin',
          establishment_id: 'e',
          display_name: 'A',
          permissions: [],
        },
        'orders_cancel'
      )
    ).toBe(true);
  });
});

describe('MembershipPinModel PIN format', () => {
  it('accepts 2–8 digit PINs for verify', () => {
    expect(MembershipPinModel.isValidPinFormat('12')).toBe(true);
    expect(MembershipPinModel.isValidPinFormat('1234')).toBe(true);
    expect(MembershipPinModel.isValidPinFormat('12345678')).toBe(true);
    expect(MembershipPinModel.isValidPinFormat('1')).toBe(false);
    expect(MembershipPinModel.isValidPinFormat('123456789')).toBe(false);
    expect(MembershipPinModel.isValidPinFormat('12ab')).toBe(false);
  });
});
