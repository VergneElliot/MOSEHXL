/**
 * Setup Authentication Manager
 * Handles JWT token generation and authentication for setup process
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import { Logger } from '../../../utils/logger';
import { SetupJwtPayload } from './types';

/**
 * Setup authentication management service
 */
export class SetupAuthManager {
  private static logger = Logger.getInstance();
  private static readonly JWT_VERIFY_OPTIONS: jwt.VerifyOptions = { algorithms: ['HS256'] };

  private static assertAuthUser(
    user: unknown
  ): asserts user is { id: number; email: string; role: string } {
    const u = user as { id?: unknown; email?: unknown; role?: unknown };
    if (typeof u?.id !== 'number' || typeof u?.email !== 'string' || typeof u?.role !== 'string') {
      throw new Error('Invalid user object for token generation');
    }
  }

  /**
   * Generate authentication token for setup completion
   */
  public static generateAuthToken(
    user: unknown, 
    establishmentId: string,
    expiresIn: '7d' | '24h' | '1h' | '30m' = '7d'
  ): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    this.assertAuthUser(user);
    const payload: SetupJwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      establishmentId: establishmentId
    };

    try {
      const options: SignOptions = { expiresIn };
      const token = jwt.sign(payload, jwtSecret, options);
      
      this.logger.debug(
        'Authentication token generated for setup completion',
        undefined,
        'SETUP_AUTH'
      );

      return token;
    } catch (error) {
      this.logger.error(
        'Failed to generate authentication token',
        error as Error,
        'SETUP_AUTH'
      );
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Verify authentication token
   */
  public static verifyAuthToken(token: string): SetupJwtPayload {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    try {
      const decoded = jwt.verify(
        token,
        jwtSecret,
        SetupAuthManager.JWT_VERIFY_OPTIONS
      ) as SetupJwtPayload;
      
      this.logger.debug(
        'Authentication token verified',
        undefined,
        'SETUP_AUTH'
      );

      return decoded;
    } catch {
      this.logger.warn(
        'Invalid authentication token',
        undefined,
        'SETUP_AUTH'
      );
      throw new Error('Invalid authentication token');
    }
  }

  /**
   * Generate temporary setup token (for multi-step setup)
   */
  public static generateTemporaryToken(
    establishmentId: string,
    stepId: string,
    expiresIn: '7d' | '24h' | '1h' | '30m' = '1h'
  ): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const payload = {
      establishmentId,
      stepId,
      type: 'temporary_setup',
      iat: Math.floor(Date.now() / 1000)
    };

    try {
      const options: SignOptions = { expiresIn };
      const token = jwt.sign(payload, jwtSecret, options);
      
      this.logger.debug(
        'Temporary setup token generated',
        undefined,
        'SETUP_AUTH'
      );

      return token;
    } catch (error) {
      this.logger.error(
        'Failed to generate temporary setup token',
        error as Error,
        'SETUP_AUTH'
      );
      throw new Error('Failed to generate temporary setup token');
    }
  }

  /**
   * Verify temporary setup token
   */
  public static verifyTemporaryToken(token: string): {
    establishmentId: string;
    stepId: string;
    type: string;
  } {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    try {
      const decoded = jwt.verify(token, jwtSecret, SetupAuthManager.JWT_VERIFY_OPTIONS) as {
        establishmentId?: unknown;
        stepId?: unknown;
        type?: unknown;
      };
      
      if (decoded.type !== 'temporary_setup') {
        throw new Error('Invalid token type');
      }
      if (typeof decoded.establishmentId !== 'string' || typeof decoded.stepId !== 'string') {
        throw new Error('Invalid temporary token payload');
      }

      this.logger.debug(
        'Temporary setup token verified',
        { establishmentId: decoded.establishmentId, stepId: decoded.stepId },
        'SETUP_AUTH'
      );

      return {
        establishmentId: decoded.establishmentId,
        stepId: decoded.stepId,
        type: 'temporary_setup'
      };
    } catch (error) {
      this.logger.warn(
        'Invalid temporary setup token',
        { error: (error as Error).message },
        'SETUP_AUTH'
      );
      throw new Error('Invalid temporary setup token');
    }
  }

  /**
   * Extract user info from token without verification (for logging)
   */
  public static extractTokenInfo(token: string): Partial<SetupJwtPayload> {
    try {
      const decoded = jwt.decode(token) as SetupJwtPayload;
      return {
        userId: decoded?.userId,
        email: decoded?.email,
        establishmentId: decoded?.establishmentId
      };
    } catch {
      return {};
    }
  }

  /**
   * Check if token is expired
   */
  public static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as { exp?: unknown } | null;
      if (!decoded || typeof decoded.exp !== 'number') {
        return true;
      }
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration date
   */
  public static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as { exp?: unknown } | null;
      if (!decoded || typeof decoded.exp !== 'number') {
        return null;
      }
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }
}
