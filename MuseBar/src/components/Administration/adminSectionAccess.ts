/**
 * Administration sub-tab access helpers (land + free nav within the page).
 */

import { pinActorHasPermission } from '../../utils/pinSessionPermissions';

export type AdminSectionDef = {
  key: string;
  permission: string | null;
};

/** True when the section is basic (null) or the focused PIN already holds the right. */
export function adminSectionHeldByActor(
  permission: string | null,
  actor: Parameters<typeof pinActorHasPermission>[0]
): boolean {
  if (permission == null) return true;
  return pinActorHasPermission(actor, permission);
}

/**
 * Index of the first section the actor can open without a step-up PIN.
 * Falls back to the first basic section (Pointage), then 0.
 */
export function firstHeldAdminSectionIndex(
  sections: AdminSectionDef[],
  actor: Parameters<typeof pinActorHasPermission>[0]
): number {
  const held = sections.findIndex((s) => adminSectionHeldByActor(s.permission, actor));
  if (held >= 0) return held;
  const basic = sections.findIndex((s) => s.permission == null);
  return basic >= 0 ? basic : 0;
}
