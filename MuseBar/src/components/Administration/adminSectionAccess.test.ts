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

  it('denies a specific section the staff PIN does not hold', () => {
    expect(
      adminSectionHeldByActor('access_inbox', { role: 'staff', permissions: ['access_planning'] })
    ).toBe(false);
  });

  it('system_admin holds every gated section', () => {
    expect(
      adminSectionHeldByActor('access_documents', { role: 'system_admin', permissions: [] })
    ).toBe(true);
  });

  it('falls back to index 0 when every section is gated and none are held', () => {
    const gatedOnly = [
      { key: 'inbox', permission: 'access_inbox' },
      { key: 'docs', permission: 'access_documents' },
    ];
    expect(firstHeldAdminSectionIndex(gatedOnly, { role: 'staff', permissions: [] })).toBe(0);
  });
});
