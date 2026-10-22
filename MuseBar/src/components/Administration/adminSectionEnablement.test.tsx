/**
 * Light RTL: permission-gated section enablement (same branching as AdministrationContainer).
 * Does not mount the full Admin tree.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { adminSectionHeldByActor } from './adminSectionAccess';

function AdminSectionTab({
  label,
  permission,
  actor,
}: {
  label: string;
  permission: string | null;
  actor: { role: string; permissions: string[] } | null;
}) {
  const held = adminSectionHeldByActor(permission, actor);
  return (
    <button type="button" disabled={!held} aria-label={label}>
      {label}
    </button>
  );
}

describe('admin section enablement (permission-gated)', () => {
  it('enables basic (null) sections for any actor', () => {
    render(
      <AdminSectionTab label="Pointage" permission={null} actor={{ role: 'staff', permissions: [] }} />
    );
    expect(screen.getByRole('button', { name: 'Pointage' })).toBeEnabled();
  });

  it('disables gated sections the PIN does not hold', () => {
    render(
      <AdminSectionTab
        label="Documents"
        permission="access_documents"
        actor={{ role: 'staff', permissions: ['access_planning'] }}
      />
    );
    expect(screen.getByRole('button', { name: 'Documents' })).toBeDisabled();
  });

  it('enables gated sections for establishment_admin', () => {
    render(
      <AdminSectionTab
        label="Inbox"
        permission="access_inbox"
        actor={{ role: 'establishment_admin', permissions: [] }}
      />
    );
    expect(screen.getByRole('button', { name: 'Inbox' })).toBeEnabled();
  });
});
