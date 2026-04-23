import { PoolClient } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { Logger } from '../../../utils/logger';
import { validatePassword } from '../../../utils/passwordValidation';
import { UserQueries } from '../../../utils/database';

export interface UserAccountData {
  email: string;
  password: string;
  establishmentId: string;
  role: string;
}

export interface CreatedUserAccount {
  id: string;
  email: string;
  role: string;
  establishmentId: string;
  token: string;
}

export interface SetupUserAccountInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
}

export class UserAccountOperations {
  private static logger = Logger.getInstance();
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
   * Create a new establishment admin user account
   */
  public async createEstablishmentAdmin(
    client: PoolClient,
    userData: UserAccountData,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CreatedUserAccount> {
    const { email, password, establishmentId, role } = userData;

    try {
      // 1. Hash the password
      const passwordHash = await bcrypt.hash(password, 12);
      this.logger.debug('Password hashed successfully for user', { email });

      // 2. Create user in database
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
        [email, passwordHash, role, establishmentId, false, true]
      );

      const user = userResult.rows[0];
      this.logger.info('Establishment admin user created successfully', { 
        userId: user.id, 
        email: user.email,
        establishmentId: user.establishment_id 
      });

      // 3. Generate JWT token
      const token = this.generateJWTToken({
        id: parseInt(user.id),
        email: user.email,
        is_admin: false,
        establishment_id: user.establishment_id
      });

      // 4. Log audit trail using transaction client to prevent deadlock
      await client.query(
        `INSERT INTO audit_trail (
          user_id, action_type, resource_type, resource_id, 
          action_details, ip_address, user_agent, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.id,
          'ESTABLISHMENT_ADMIN_CREATED',
          'USER',
          user.id,
          JSON.stringify({
            email: user.email,
            role: user.role,
            establishment_id: user.establishment_id,
            account_type: 'establishment_admin'
          }),
          ipAddress,
          userAgent,
          null // session_id
        ]
      );
      this.logger.info('Audit trail logged for establishment admin creation', { userId: user.id });

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        establishmentId: user.establishment_id,
        token
      };

    } catch (error) {
      this.logger.error('Failed to create establishment admin user', error as Error);
      throw new Error(`Failed to create establishment admin user: ${(error as Error).message}`);
    }
  }

  /**
   * Validate user account data
   */
  public validateUserAccountData(userData: UserAccountData): { isValid: boolean; error?: string } {
    const { email, password, establishmentId, role } = userData;

    // Email validation
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

    // Establishment ID validation
    if (!establishmentId || establishmentId.trim() === '') {
      return { isValid: false, error: 'Establishment ID is required' };
    }

    // Role validation
    if (!role || role.trim() === '') {
      return { isValid: false, error: 'Role is required' };
    }

    const validRoles = ['establishment_admin', 'establishment_manager', 'establishment_staff'];
    if (!validRoles.includes(role)) {
      return { isValid: false, error: 'Invalid role. Must be one of: establishment_admin, establishment_manager, establishment_staff' };
    }

    return { isValid: true };
  }

  // Email uniqueness check removed - users can have multiple establishments with same email

  /**
   * Generate JWT token for user
   */
  private generateJWTToken(user: { id: number; email: string; is_admin: boolean; establishment_id?: string }): string {
    const payload = {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      establishment_id: user.establishment_id
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn } as SignOptions);
  }

  /**
   * Verify password strength (uses shared utils/passwordValidation — same rule as all other flows).
   */
  public validatePasswordStrength(password: string): { isValid: boolean; error?: string; score?: number } {
    const result = validatePassword(password);
    if (!result.isValid) {
      return { isValid: false, error: result.error };
    }
    const score = [/[A-Z]/.test(password), /[a-z]/.test(password), /\d/.test(password)].filter(Boolean).length + (password.length >= 12 ? 1 : 0);
    return { isValid: true, score };
  }

  /**
   * Shared helper used by setup and account-creation flows.
   * Keeps user lookup logic centralized in a single module.
   */
  static async checkUserExists(
    client: PoolClient,
    email: string
  ): Promise<{ exists: boolean; userId?: number; hasEstablishment?: boolean }> {
    try {
      const existing = await UserQueries.checkUserExists(client, email);
      if (!existing.exists) {
        return { exists: false };
      }

      const userRecord = existing.user as { id?: number | string } | undefined;
      const parsedUserId = Number(userRecord?.id);

      return {
        exists: true,
        userId: Number.isFinite(parsedUserId) ? parsedUserId : undefined,
        hasEstablishment: existing.hasEstablishment
      };
    } catch (error) {
      this.logger.error('Error checking user existence:', error as Error);
      throw new Error('Failed to check user existence');
    }
  }

  /**
   * Shared setup-compatible create/update path.
   * This replaces the legacy setup-local userAccountOperations module.
   */
  static async createOrUpdateUserAccount(
    client: PoolClient,
    setupData: SetupUserAccountInput,
    establishmentId: string
  ) {
    try {
      const existingUser = await this.checkUserExists(client, setupData.email);

      if (existingUser.exists) {
        const updateResult = await client.query(
          `UPDATE users
           SET
             first_name = $1,
             last_name = $2,
             phone = $3,
             establishment_id = $4,
             role = 'establishment_admin',
             is_admin = false,
             updated_at = CURRENT_TIMESTAMP
           WHERE email = $5
           RETURNING id, email, first_name, last_name, establishment_id`,
          [
            setupData.first_name,
            setupData.last_name,
            setupData.phone,
            establishmentId,
            setupData.email
          ]
        );

        this.logger.info(`Updated existing user: ${setupData.email}`);
        return updateResult.rows[0];
      }

      const hashedPassword = await bcrypt.hash(setupData.password, 12);
      const newUserResult = await client.query(
        `INSERT INTO users (
           first_name,
           last_name,
           email,
           password_hash,
           phone,
           establishment_id,
           role,
           is_admin,
           created_at,
           updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'establishment_admin', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, email, first_name, last_name, establishment_id`,
        [
          setupData.first_name,
          setupData.last_name,
          setupData.email,
          hashedPassword,
          setupData.phone,
          establishmentId
        ]
      );

      this.logger.info(`Created new user: ${setupData.email}`);
      return newUserResult.rows[0];
    } catch (error) {
      this.logger.error('Error creating/updating user account:', error as Error);
      throw new Error('Failed to create or update user account');
    }
  }

  static async validateUserCredentials(
    client: PoolClient,
    email: string,
    password: string
  ): Promise<boolean> {
    try {
      const userQuery = await client.query(
        `SELECT password_hash
         FROM users
         WHERE email = $1`,
        [email]
      );

      if (userQuery.rows.length === 0) {
        return false;
      }

      const { password_hash } = userQuery.rows[0] as { password_hash: string };
      return await bcrypt.compare(password, password_hash);
    } catch (error) {
      this.logger.error('Error validating user credentials:', error as Error);
      return false;
    }
  }

  static async updateUserRole(
    client: PoolClient,
    userId: number,
    role: string,
    isAdmin: boolean = false
  ): Promise<void> {
    try {
      await client.query(
        `UPDATE users
         SET
           role = $1,
           is_admin = $2,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [role, isAdmin, userId]
      );

      this.logger.info(`Updated user role: ${userId} -> ${role} (admin: ${isAdmin})`);
    } catch (error) {
      this.logger.error('Error updating user role:', error as Error);
      throw new Error('Failed to update user role');
    }
  }

  static async getUserWithEstablishment(client: PoolClient, userId: number) {
    try {
      return await UserQueries.getUserWithEstablishment(client, userId);
    } catch (error) {
      this.logger.error('Error getting user with establishment:', error as Error);
      throw new Error('Failed to retrieve user information');
    }
  }
}
