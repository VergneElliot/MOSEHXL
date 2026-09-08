import { isSpecificPermission } from '@mosehxl/types';
import { UserModel } from '../../models/user';
import { MembershipPinModel } from '../../models/membershipPin';
import { StaffPinSessionModel } from '../../models/staffPinSession';
import { requiresPinResetAfterGrantChange } from '../../permissions/resolve';

export interface PermissionGrantResult {
  /** Grants actually stored (specific tier only). */
  granted: string[];
  /** Effective permissions after the change, basic tier included. */
  permissions: string[];
  /**
   * True when the account's 2-digit PIN was cleared because it now holds specific
   * permissions and must use a 4–8 digit PIN.
   */
  pin_cleared: boolean;
  /** Open badges closed because their token carries the old permission set. */
  sessions_closed: number;
}

function samePermissionSet(before: string[], after: string[]): boolean {
  if (before.length !== after.length) return false;
  const set = new Set(before);
  return after.every((name) => set.has(name));
}

/**
 * Replaces the specific-permission grants of one account in one establishment.
 *
 * Basic-tier keys are dropped: they are held implicitly by every membership, so storing
 * them would let a revoked row look like a downgrade. Unknown keys are dropped too.
 */
export async function applyPermissionGrants(opts: {
  targetUserId: number;
  establishmentId: string;
  requested: string[];
}): Promise<PermissionGrantResult> {
  const granted = Array.from(new Set(opts.requested.filter(isSpecificPermission)));

  const membership = await MembershipPinModel.getMembershipWithPin(
    opts.targetUserId,
    opts.establishmentId
  );
  const permissionsBefore = await UserModel.getUserPermissions(
    opts.targetUserId,
    opts.establishmentId
  );

  await UserModel.setUserPermissions(opts.targetUserId, granted, opts.establishmentId);

  const permissions = await UserModel.getUserPermissions(
    opts.targetUserId,
    opts.establishmentId
  );

  const pinReset = requiresPinResetAfterGrantChange({
    hasPin: Boolean(membership?.pin_hash),
    role: membership?.role ?? 'staff',
    permissionsBefore,
    permissionsAfter: permissions,
  });

  if (pinReset) {
    await MembershipPinModel.clearPin(opts.targetUserId, opts.establishmentId);
  }

  // PIN actor tokens carry a permission snapshot, so a live badge would keep the old rights
  // until it expires. Closing the badges forces a re-identification with the new set.
  let sessionsClosed = 0;
  if (pinReset || !samePermissionSet(permissionsBefore, permissions)) {
    sessionsClosed = await StaffPinSessionModel.closeAllForUser(
      opts.targetUserId,
      opts.establishmentId,
      pinReset ? 'pin_cleared' : 'permissions_changed'
    );
  }

  return { granted, permissions, pin_cleared: pinReset, sessions_closed: sessionsClosed };
}
