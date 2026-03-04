import { PoolClient } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Logger } from '../../../utils/logger';
import { validatePassword } from '../../../utils/passwordValidation';
import { AuditTrailModel } from '../../../models/auditTrail';

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

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn } as any);
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
}
