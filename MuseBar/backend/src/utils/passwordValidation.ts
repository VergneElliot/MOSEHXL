/**
 * Shared password validation — single source of truth for all flows.
 * Use this for: setup wizard, establishment account creation, invitation acceptance,
 * user creation, and any other place that sets or validates a new password.
 * Ensures a user cannot pass one flow (e.g. invitation) and fail another (e.g. setup)
 * due to different rules.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate password against the canonical rule set.
 * Returns the first failing rule as error, or { isValid: true }.
 * Use this when you need a single pass/fail and one message (e.g. API response).
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { isValid: false, error: 'Password must be at most 128 characters long' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  return { isValid: true };
}

/**
 * Error entry for use in setup/forms that show multiple validation messages.
 */
export interface PasswordValidationError {
  field: string;
  message: string;
}

/**
 * Return all validation errors for the password (for setup wizards that list every rule).
 * If you only need one error, use validatePassword() instead.
 */
export function getPasswordValidationErrors(password: string): PasswordValidationError[] {
  const errors: PasswordValidationError[] = [];
  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
    return errors;
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push({ field: 'password', message: 'Password must be at most 128 characters long' });
  }
  if (!/[a-z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
  }
  if (!/[A-Z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
  }
  if (!/\d/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one number' });
  }
  return errors;
}
