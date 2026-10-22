import { validatePassword } from '../../../utils/passwordValidation';
import type { UserAccountData } from './userAccountTypes';

export function validateUserAccountData(
  userData: UserAccountData
): { isValid: boolean; error?: string } {
  const { email, password, establishmentId, role } = userData;

  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  const passwordCheck = validatePassword(password ?? '');
  if (!passwordCheck.isValid) {
    return { isValid: false, error: passwordCheck.error ?? 'Invalid password' };
  }

  if (!establishmentId || establishmentId.trim() === '') {
    return { isValid: false, error: 'Establishment ID is required' };
  }

  if (!role || role.trim() === '') {
    return { isValid: false, error: 'Role is required' };
  }

  const validRoles = ['establishment_admin', 'establishment_manager', 'establishment_staff'];
  if (!validRoles.includes(role)) {
    return { isValid: false, error: 'Invalid role. Must be one of: establishment_admin, establishment_manager, establishment_staff' };
  }

  return { isValid: true };
}

/**
 * Verify password strength (uses shared utils/passwordValidation — same rule as all other flows).
 */
export function validatePasswordStrength(
  password: string
): { isValid: boolean; error?: string; score?: number } {
  const result = validatePassword(password);
  if (!result.isValid) {
    return { isValid: false, error: result.error };
  }
  const score = [/[A-Z]/.test(password), /[a-z]/.test(password), /\d/.test(password)].filter(Boolean).length + (password.length >= 12 ? 1 : 0);
  return { isValid: true, score };
}
