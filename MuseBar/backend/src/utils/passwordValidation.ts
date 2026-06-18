import crypto from 'crypto';
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

const PASSWORD_BREACH_API_URL = 'https://api.pwnedpasswords.com/range';

function isPasswordBreachCheckEnabled(): boolean {
  return process.env.PASSWORD_BREACH_CHECK_ENABLED?.trim().toLowerCase() === 'true';
}

function getPasswordBreachCheckTimeoutMs(): number {
  const raw = Number(process.env.PASSWORD_BREACH_CHECK_TIMEOUT_MS ?? 2500);
  return Number.isFinite(raw) && raw > 0 ? raw : 2500;
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

async function isPasswordCompromised(password: string): Promise<boolean> {
  const hashHex = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();

  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getPasswordBreachCheckTimeoutMs());
  try {
    const response = await fetch(`${PASSWORD_BREACH_API_URL}/${prefix}`, {
      headers: {
        'Add-Padding': 'true',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      return false;
    }
    const body = await response.text();
    const normalizedLines = body.split('\n').map((line) => line.trim()).filter(Boolean);
    return normalizedLines.some((line) => line.split(':')[0]?.toUpperCase() === suffix);
  } catch {
    // Optional control: fail-open when breach API is unavailable.
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function validatePasswordWithBreachCheck(password: string): Promise<PasswordValidationResult> {
  const basic = validatePassword(password);
  if (!basic.isValid) {
    return basic;
  }
  if (!isPasswordBreachCheckEnabled()) {
    return basic;
  }

  const compromised = await isPasswordCompromised(password);
  if (compromised) {
    return {
      isValid: false,
      error: 'Password has appeared in known data breaches. Please choose a different password.',
    };
  }

  return basic;
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
