/**
 * Create PIN-only staff actors (no email/password login).
 */

import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { pool } from '../../db/pool';
import { MembershipModel } from '../../models/membership';
import { MembershipPinModel } from '../../models/membershipPin';
import { resolvePinLengthRules } from '../../services/auth/pinRules';
import { ValidationError } from '../../middleware/errorHandler';

function bcryptRounds(): number {
  const raw = process.env.BCRYPT_ROUNDS;
  const parsed = raw ? Number.parseInt(raw, 10) : 12;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
}

/** Unusable password hash — login blocked via can_login=false. */
async function unusablePasswordHash(): Promise<string> {
  return bcrypt.hash(`!pin-only!${randomBytes(16).toString('hex')}`, bcryptRounds());
}

export async function createPinOnlyStaff(input: {
  establishmentId: string;
  firstName: string;
  lastName?: string | null;
  pin: string;
  role?: 'staff' | 'establishment_admin';
}): Promise<{
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  establishment_id: string;
  can_login: boolean;
}> {
  const firstName = input.firstName.trim();
  if (firstName.length < 1) throw new ValidationError('Prénom requis');
  const lastName = input.lastName?.trim() || null;
  const role = input.role === 'establishment_admin' ? 'establishment_admin' : 'staff';
  const pin = String(input.pin || '');

  const rules = resolvePinLengthRules({
    role,
    permissions: [],
  });
  if (!MembershipPinModel.isValidPinFormat(pin)) {
    throw new ValidationError('PIN invalide');
  }

  const email = `pin.${randomBytes(8).toString('hex')}@staff.local`;
  const passwordHash = await unusablePasswordHash();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query(
      `INSERT INTO users (
         email, password_hash, is_admin, role, establishment_id,
         first_name, last_name, email_verified, can_login
       ) VALUES ($1, $2, FALSE, $3, $4, $5, $6, TRUE, FALSE)
       RETURNING id, email, first_name, last_name, role, establishment_id, can_login`,
      [email, passwordHash, role, input.establishmentId, firstName, lastName]
    );
    const user = userResult.rows[0];
    await MembershipModel.upsert({
      user_id: user.id,
      establishment_id: input.establishmentId,
      role,
      client,
    });
    await client.query('COMMIT');

    await MembershipPinModel.setPin(user.id, input.establishmentId, pin, rules);

    return {
      id: Number(user.id),
      email: String(user.email),
      first_name: user.first_name,
      last_name: user.last_name,
      role: String(user.role),
      establishment_id: String(user.establishment_id),
      can_login: false,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
