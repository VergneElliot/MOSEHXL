import { pool } from '../../db/pool';
import { MembershipModel } from '../../models/membership';
import { MembershipPinModel } from '../../models/membershipPin';
import { RefreshTokenModel } from '../../models/refreshToken';
import { StaffPinSessionModel } from '../../models/staffPinSession';
import { UserModel } from '../../models/user';

/**
 * What a staff account left behind in this establishment. An account that rang anything up can
 * never be deleted: past orders and journal entries must stay attributable to a real identity.
 */
export interface AccountFootprint {
  orders: number;
  journal_entries: number;
  audit_entries: number;
  time_entries: number;
  purgeable: boolean;
}

export interface DeactivationResult {
  deactivated: boolean;
  pin_cleared: boolean;
  sessions_closed: number;
}

export async function describeAccountFootprint(
  userId: number,
  establishmentId: string
): Promise<AccountFootprint> {
  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM orders
         WHERE establishment_id = $2
           AND (waiter_user_id = $1 OR account_user_id = $1))::int AS orders,
       (SELECT COUNT(*) FROM legal_journal
         WHERE establishment_id = $2 AND user_id = $1::text)::int AS journal_entries,
       (SELECT COUNT(*) FROM audit_trail
         WHERE establishment_id = $2
           AND (user_id = $1::text OR pin_user_id = $1))::int AS audit_entries,
       (SELECT COUNT(*) FROM time_entries
         WHERE establishment_id = $2 AND user_id = $1)::int AS time_entries`,
    [userId, establishmentId]
  );

  const row = (result.rows[0] ?? {}) as Record<string, number>;
  const footprint = {
    orders: row.orders ?? 0,
    journal_entries: row.journal_entries ?? 0,
    audit_entries: row.audit_entries ?? 0,
    time_entries: row.time_entries ?? 0,
  };

  return {
    ...footprint,
    purgeable: Object.values(footprint).every((count) => count === 0),
  };
}

/**
 * Default way to remove someone from the floor: the membership is disabled, the PIN is cleared,
 * open badges are closed and login sessions are revoked — while the account itself stays so
 * everything it did remains attributable.
 */
export async function deactivateStaffAccount(
  userId: number,
  establishmentId: string
): Promise<DeactivationResult> {
  const membership = await MembershipModel.getIncludingInactive(userId, establishmentId);
  const hadPin = Boolean(membership?.pin_hash);

  await MembershipModel.upsert({
    user_id: userId,
    establishment_id: establishmentId,
    role: membership?.role ?? 'staff',
    is_active: false,
  });

  if (hadPin) {
    await MembershipPinModel.clearPin(userId, establishmentId);
  }
  const sessionsClosed = await StaffPinSessionModel.closeAllForUser(
    userId,
    establishmentId,
    'account_deactivated'
  );
  await RefreshTokenModel.revokeAllForUser(userId, 'account_deactivated');

  return { deactivated: true, pin_cleared: hadPin, sessions_closed: sessionsClosed };
}

export async function reactivateStaffAccount(
  userId: number,
  establishmentId: string
): Promise<boolean> {
  const membership = await MembershipModel.getIncludingInactive(userId, establishmentId);
  if (!membership) return false;
  await MembershipModel.upsert({
    user_id: userId,
    establishment_id: establishmentId,
    role: membership.role,
    is_active: true,
  });
  return true;
}

/**
 * Hard delete, allowed only for an account with no recorded activity — a mistyped invitation,
 * a duplicate. Anything else must stay deactivated.
 */
export async function purgeStaffAccount(
  userId: number,
  establishmentId: string
): Promise<{ purged: boolean; footprint: AccountFootprint }> {
  const footprint = await describeAccountFootprint(userId, establishmentId);
  if (!footprint.purgeable) return { purged: false, footprint };

  await StaffPinSessionModel.closeAllForUser(userId, establishmentId, 'account_purged');
  await RefreshTokenModel.revokeAllForUser(userId, 'account_purged');
  await MembershipModel.remove(userId, establishmentId);

  const remaining = await pool.query(
    'SELECT 1 FROM user_establishment_memberships WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  if (remaining.rowCount === 0) {
    await UserModel.deleteUserById(userId);
  }

  return { purged: true, footprint };
}
