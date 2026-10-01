/**
 * After venue-login admin account creation, set the owner PIN on the membership.
 */

import { MembershipPinModel } from '../../models/membershipPin';
import { resolvePinLengthRules } from './pinRules';
import { ValidationError } from '../../middleware/errorHandler';

export async function bootstrapOwnerPin(input: {
  userId: number;
  establishmentId: string;
  ownerPin: string;
}): Promise<void> {
  const pin = String(input.ownerPin || '').trim();
  if (!MembershipPinModel.isValidPinFormat(pin)) {
    throw new ValidationError('PIN propriétaire invalide (4–8 chiffres recommandés pour admin)');
  }
  const rules = resolvePinLengthRules({
    role: 'establishment_admin',
    permissions: [],
  });
  await MembershipPinModel.setPin(input.userId, input.establishmentId, pin, rules);
}
