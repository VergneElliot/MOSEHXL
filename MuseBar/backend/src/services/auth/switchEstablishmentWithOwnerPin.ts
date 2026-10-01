/**
 * Switch the account JWT to another establishment membership (owner PIN required).
 */

import { MembershipModel } from '../../models/membership';
import { MembershipPinModel } from '../../models/membershipPin';
import { UserModel } from '../../models/user';
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from '../../middleware/errorHandler';
import { deriveCanonicalRole } from '../../auth/roleVocabulary';
import { generateToken } from '../../middleware/auth';
import { ACCESS_TOKEN_EXPIRES_IN } from '../../routes/authLogin/config';

export async function switchEstablishmentWithOwnerPin(input: {
  userId: number;
  email: string;
  currentEstablishmentId: string | null | undefined;
  targetEstablishmentId: string;
  ownerPin: string;
  rememberMe: boolean;
  isSystemAdmin: boolean;
  supportImpersonation?: boolean | null;
}): Promise<{
  token: string;
  expiresIn: string;
  user: Record<string, unknown>;
  membershipRole: string;
}> {
  const establishment_id = input.targetEstablishmentId.trim();
  const owner_pin = input.ownerPin.trim();

  if (!establishment_id) {
    throw new ValidationError('establishment_id is required');
  }
  if (!owner_pin) {
    throw new ValidationError('owner_pin is required to switch venue');
  }
  if (!MembershipPinModel.isValidPinFormat(owner_pin)) {
    throw new ValidationError('Invalid owner PIN format');
  }

  if (input.isSystemAdmin && !input.supportImpersonation) {
    throw new AuthorizationError('System administrators cannot switch establishments this way');
  }

  const membership = await MembershipModel.get(input.userId, establishment_id);
  if (!membership) {
    throw new AuthorizationError('No active membership for this establishment');
  }

  const pinCheck = await MembershipPinModel.verifyUserPin(
    input.userId,
    establishment_id,
    owner_pin
  );
  if (!pinCheck.ok) {
    if (pinCheck.reason === 'missing') {
      throw new ValidationError(
        'Définissez le PIN propriétaire de ce compte sur cet établissement avant de basculer'
      );
    }
    if (pinCheck.reason === 'locked') {
      throw new AuthenticationError('PIN temporairement verrouillé — réessayez plus tard');
    }
    throw new AuthenticationError('PIN propriétaire incorrect');
  }

  await MembershipModel.setActiveEstablishment(input.userId, establishment_id, membership.role);

  const role = deriveCanonicalRole({
    roleFromDb: membership.role,
    isAdminFlag: false,
    establishmentId: establishment_id,
  });

  const token = generateToken(
    { id: input.userId, email: input.email, role, establishment_id },
    input.rememberMe,
    ACCESS_TOKEN_EXPIRES_IN as Parameters<typeof generateToken>[2]
  );

  const [userRow, permissions, memberships] = await Promise.all([
    UserModel.getAuthMeProfile(input.userId),
    UserModel.getUserPermissions(input.userId, establishment_id).catch(() => [] as string[]),
    MembershipModel.listForUser(input.userId),
  ]);

  return {
    token,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    membershipRole: membership.role,
    user: {
      id: input.userId,
      email: input.email,
      is_admin: false,
      role,
      establishment_id,
      first_name: userRow?.first_name || '',
      last_name: userRow?.last_name || '',
      email_verified: userRow?.email_verified ?? false,
      permissions,
      memberships: MembershipModel.toApiList(memberships),
      support_impersonation: input.supportImpersonation ?? null,
    },
  };
}
