import { describe, expect, it } from 'vitest';
import {
  adminSectionHeldByActor,
  firstHeldAdminSectionIndex,
} from './adminSectionAccess';

const sections = [
  { key: 'inbox', permission: 'access_inbox' },
  { key: 'reservations', permission: 'access_reservations' },
  { key: 'planning', permission: 'access_planning' },
  { key: 'time_clock', permission: null },
  { key: 'documents', permission: 'access_documents' },
];

describe('adminSectionAccess', () => {
  it('treats null permission as held by anyone', () => {
    expect(adminSectionHeldByActor(null, { role: 'staff', permissions: [] })).toBe(true);
  });

  it('lands on the first section the PIN holds', () => {
    const actor = { role: 'staff' as const, permissions: ['access_planning'] };
    expect(firstHeldAdminSectionIndex(sections, actor)).toBe(2);
  });

  it('falls back to Pointage when no specific rights', () => {
    const actor = { role: 'staff' as const, permissions: [] };
    expect(firstHeldAdminSectionIndex(sections, actor)).toBe(3);
  });

  it('establishment_admin lands on the first section', () => {
    const actor = { role: 'establishment_admin' as const, permissions: [] };
    expect(firstHeldAdminSectionIndex(sections, actor)).toBe(0);
  });
});
