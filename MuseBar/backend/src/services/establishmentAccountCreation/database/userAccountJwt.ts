import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

export function generateUserAccountJwt(
  user: { id: number; email: string; role: string; establishment_id?: string },
  jwtSecret: string,
  jwtExpiresIn: string
): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    establishment_id: user.establishment_id
  };

  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn } as SignOptions);
}
