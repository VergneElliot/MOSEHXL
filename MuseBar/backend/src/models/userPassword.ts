import { validatePasswordWithBreachCheck } from '../utils/passwordValidation';

export async function assertPasswordPolicy(password: string): Promise<void> {
  const passwordValidation = await validatePasswordWithBreachCheck(password);
  if (!passwordValidation.isValid) {
    throw Object.assign(
      new Error(passwordValidation.error ?? 'Invalid password'),
      { statusCode: 400 }
    );
  }
}
