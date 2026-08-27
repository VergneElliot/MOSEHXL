/** Client-side PIN length hints (must stay aligned with backend pinRules). */

import { PERMISSIONS } from '@mosehxl/types';

export const PIN_BASIC_LENGTH = 2;
export const PIN_ELEVATED_MIN_LENGTH = 4;
export const PIN_ELEVATED_MAX_LENGTH = 8;
export const PIN_VERIFY_MIN_LENGTH = 2;
export const PIN_VERIFY_MAX_LENGTH = 8;

const ELEVATED_PIN_PERMISSIONS: readonly string[] = [
  PERMISSIONS.pos_happyhour_manual,
  PERMISSIONS.pos_apply_offert,
  PERMISSIONS.pos_apply_perso,
  PERMISSIONS.orders_cancel,
  PERMISSIONS.access_menu,
  PERMISSIONS.access_settings,
  PERMISSIONS.access_closure,
  PERMISSIONS.access_user_management,
  PERMISSIONS.access_documents,
  PERMISSIONS.access_inbox,
  PERMISSIONS.access_reservations,
  PERMISSIONS.access_planning,
  PERMISSIONS.manage_floor_plan,
  PERMISSIONS.access_compliance,
];

export type PinKind = 'basic' | 'elevated';

export interface PinLengthRules {
  kind: PinKind;
  min_length: number;
  max_length: number;
}

export function resolvePinLengthRules(input: {
  role: string;
  permissions: string[];
}): PinLengthRules {
  const elevated =
    input.role === 'establishment_admin' ||
    input.role === 'system_admin' ||
    input.permissions.some((p) => ELEVATED_PIN_PERMISSIONS.includes(p));
  if (elevated) {
    return {
      kind: 'elevated',
      min_length: PIN_ELEVATED_MIN_LENGTH,
      max_length: PIN_ELEVATED_MAX_LENGTH,
    };
  }
  return {
    kind: 'basic',
    min_length: PIN_BASIC_LENGTH,
    max_length: PIN_BASIC_LENGTH,
  };
}

export function pinLengthHelperText(rules: PinLengthRules): string {
  if (rules.kind === 'basic') {
    return 'Personnel de base : PIN à exactement 2 chiffres (identification / Z). Unique dans l’établissement.';
  }
  return `Permissions élevées : PIN de ${rules.min_length} à ${rules.max_length} chiffres. Unique dans l’établissement.`;
}

export function isPinLengthValid(pin: string, rules: PinLengthRules): boolean {
  if (!/^\d+$/.test(pin)) return false;
  return pin.length >= rules.min_length && pin.length <= rules.max_length;
}
