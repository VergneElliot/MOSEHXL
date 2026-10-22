import { describe, expect, it } from 'vitest';
import { pinActorHasPermission } from './pinSessionPermissions';

describe('pinActorHasPermission', () => {
  it('returns false for nullish actors', () => {
    expect(pinActorHasPermission(null, 'access_pos')).toBe(false);
    expect(pinActorHasPermission(undefined, 'access_pos')).toBe(false);
  });

  it('grants every key to establishment_admin and system_admin', () => {
    expect(
      pinActorHasPermission({ role: 'establishment_admin', permissions: [] }, 'access_settings')
    ).toBe(true);
    expect(
      pinActorHasPermission({ role: 'system_admin', permissions: [] }, 'orders_cancel')
    ).toBe(true);
  });

  it('checks the staff permission list', () => {
    const staff = { role: 'staff', permissions: ['access_pos', 'access_planning'] };
    expect(pinActorHasPermission(staff, 'access_pos')).toBe(true);
    expect(pinActorHasPermission(staff, 'access_documents')).toBe(false);
  });
});
