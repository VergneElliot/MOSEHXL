import { PoolClient } from 'pg';
import bcrypt from 'bcrypt';
import { Logger } from '../../../utils/logger';
import { validatePasswordWithBreachCheck } from '../../../utils/passwordValidation';
import { MembershipModel } from '../../../models/membership';
import type { CreatedUserAccount, UserAccountData } from './userAccountTypes';
import { generateUserAccountJwt } from './userAccountJwt';
import {
  validatePasswordStrength,
  validateUserAccountData,
} from './userAccountValidation';
import {
  checkUserExists,
  createOrUpdateUserAccount,
  getUserWithEstablishment,
  updateUserRole,
  validateUserCredentials,
} from './userAccountSetupOperations';

export type {
  CreatedUserAccount,
  SetupUserAccountInput,
  UserAccountData,
} from './userAccountTypes';

export class UserAccountOperations {
  private logger: Logger;
  private jwtSecret: string;
  private jwtExpiresIn: string;

  /**
   * @param logger - Logger instance
   * @param jwtSecret - JWT signing secret (from validated config; never a hardcoded fallback)
   */
  constructor(logger: Logger, jwtSecret: string) {
    this.logger = logger;
    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('UserAccountOperations requires a JWT secret of at least 32 characters (from config).');
    }
    this.jwtSecret = jwtSecret;
    this.jwtExpiresIn = '12h';
  }

  /**
   * Create or link an establishment admin for a venue.
   * Existing emails get a membership (no second users row).
   */
  public async createEstablishmentAdmin(
    client: PoolClient,
    userData: UserAccountData,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CreatedUserAccount> {
    const { email, password, establishmentId, role } = userData;
    const membershipRole =
      role === 'establishment_admin' || role === 'staff' ? role : 'establishment_admin';

    try {
      const passwordValidation = await validatePasswordWithBreachCheck(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.error ?? 'Invalid password');
      }

      const normalizedEmail = email.toLowerCase().trim();

      const existing = await client.query(
        `SELECT id, email, role FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [normalizedEmail]
      );

      let user: { id: string | number; email: string; role: string; establishment_id: string };

      if (existing.rows[0]) {
        user = await this.linkExistingAdmin(client, existing.rows[0], establishmentId, membershipRole);
      } else {
        user = await this.insertAdminUser(client, normalizedEmail, password, establishmentId, membershipRole);
      }

      await client.query(
        `INSERT INTO user_establishment_memberships (user_id, establishment_id, role, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (user_id, establishment_id) DO UPDATE
         SET role = EXCLUDED.role,
             is_active = TRUE,
             updated_at = CURRENT_TIMESTAMP`,
        [user.id, establishmentId, membershipRole]
      );
      await MembershipModel.ensureCalendarColor(Number(user.id), establishmentId, client);

      const token = generateUserAccountJwt(
        {
          id: parseInt(String(user.id), 10),
          email: user.email,
          role: membershipRole,
          establishment_id: establishmentId,
        },
        this.jwtSecret,
        this.jwtExpiresIn
      );

      await this.logAdminAudit(
        client,
        user,
        membershipRole,
        establishmentId,
        Boolean(existing.rows[0]),
        ipAddress,
        userAgent
      );

      return {
        id: String(user.id),
        email: user.email,
        role: membershipRole,
        establishmentId,
        token,
      };
    } catch (error) {
      this.logger.error('Failed to create establishment admin user', error as Error);
      throw new Error(`Failed to create establishment admin user: ${(error as Error).message}`);
    }
  }

  public validateUserAccountData = validateUserAccountData;
  public validatePasswordStrength = validatePasswordStrength;

  static checkUserExists = checkUserExists;
  static createOrUpdateUserAccount = createOrUpdateUserAccount;
  static validateUserCredentials = validateUserCredentials;
  static updateUserRole = updateUserRole;
  static getUserWithEstablishment = getUserWithEstablishment;

  private async linkExistingAdmin(
    client: PoolClient,
    existingRow: { id: string | number; email: string; role: string },
    establishmentId: string,
    membershipRole: string
  ): Promise<{ id: string | number; email: string; role: string; establishment_id: string }> {
    if (existingRow.role === 'system_admin') {
      throw new Error('Cannot attach a system administrator account as establishment admin');
    }

    const alreadyMember = await client.query(
      `SELECT 1 FROM user_establishment_memberships
           WHERE user_id = $1 AND establishment_id = $2 AND is_active = TRUE`,
      [existingRow.id, establishmentId]
    );
    if (alreadyMember.rows.length > 0) {
      throw new Error('This account already administers this establishment');
    }

    const updated = await client.query(
      `UPDATE users
           SET establishment_id = $2,
               role = $3,
               email_verified = TRUE,
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, email, role, establishment_id`,
      [existingRow.id, establishmentId, membershipRole]
    );
    const user = updated.rows[0];
    this.logger.info('Linked existing user as establishment admin membership', {
      userId: user.id,
      email: user.email,
      establishmentId: user.establishment_id,
    });
    return user;
  }

  private async insertAdminUser(
    client: PoolClient,
    email: string,
    password: string,
    establishmentId: string,
    membershipRole: string
  ): Promise<{ id: string | number; email: string; role: string; establishment_id: string }> {
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(
      `INSERT INTO users (
            email,
            password_hash,
            role,
            establishment_id,
            is_admin,
            email_verified,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING id, email, role, establishment_id`,
      [email, passwordHash, membershipRole, establishmentId, false, true]
    );
    const user = userResult.rows[0];
    this.logger.info('Establishment admin user created successfully', {
      userId: user.id,
      email: user.email,
      establishmentId: user.establishment_id,
    });
    return user;
  }

  private async logAdminAudit(
    client: PoolClient,
    user: { id: string | number; email: string },
    membershipRole: string,
    establishmentId: string,
    linkedExisting: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await client.query(
      `INSERT INTO audit_trail (
          user_id, action_type, resource_type, resource_id,
          action_details, ip_address, user_agent, session_id, establishment_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        user.id,
        linkedExisting ? 'ESTABLISHMENT_ADMIN_LINKED' : 'ESTABLISHMENT_ADMIN_CREATED',
        'USER',
        user.id,
        JSON.stringify({
          email: user.email,
          role: membershipRole,
          establishment_id: establishmentId,
          account_type: 'establishment_admin',
          linked_existing: linkedExisting,
        }),
        ipAddress,
        userAgent,
        null,
        establishmentId,
      ]
    );
    this.logger.info('Audit trail logged for establishment admin creation', { userId: user.id });
  }
}
