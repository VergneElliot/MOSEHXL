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

  /**
   * Generate authentication token for setup completion
   */
  public static generateAuthToken(
    user: any, 
    establishmentId: string,
    expiresIn: string = '7d'
  ): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

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
        { 
          userId: user.id, 
          email: user.email, 
          establishmentId,
          expiresIn 
        },
        'SETUP_AUTH'
      );

      return token;
    } catch (error) {
      this.logger.error(
        'Failed to generate authentication token',
        error as Error,
        { userId: user.id, establishmentId },
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
      const decoded = jwt.verify(token, jwtSecret) as SetupJwtPayload;
      
      this.logger.debug(
        'Authentication token verified',
        { userId: decoded.userId, establishmentId: decoded.establishmentId },
        'SETUP_AUTH'
      );

      return decoded;
    } catch (error) {
      this.logger.warn(
        'Invalid authentication token',
        { error: (error as Error).message },
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
    expiresIn: string = '1h'
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
        { establishmentId, stepId, expiresIn },
        'SETUP_AUTH'
      );

      return token;
    } catch (error) {
      this.logger.error(
        'Failed to generate temporary setup token',
        error as Error,
        { establishmentId, stepId },
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
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      if (decoded.type !== 'temporary_setup') {
        throw new Error('Invalid token type');
      }

      this.logger.debug(
        'Temporary setup token verified',
        { establishmentId: decoded.establishmentId, stepId: decoded.stepId },
        'SETUP_AUTH'
      );

      return {
        establishmentId: decoded.establishmentId,
        stepId: decoded.stepId,
        type: decoded.type
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
    } catch (error) {
      return {};
    }
  }

  /**
   * Check if token is expired
   */
  public static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration date
   */
  public static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return null;
      }
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }
}
