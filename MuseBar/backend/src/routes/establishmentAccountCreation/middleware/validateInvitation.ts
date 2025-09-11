/**
 * Invitation Validation Middleware
 * Validates invitation tokens for establishment account creation
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { InvitationValidationResult } from '../types';
import { Logger } from '../../../utils/logger';

/**
 * Validate invitation token middleware
 */
export const validateInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body;
    const logger = Logger.getInstance();

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Invitation token is required'
      });
      return;
    }

    // Get database connection
    const pool = req.app.locals.db as Pool;
    const client = await pool.connect();

    try {
      const validation = await validateInvitationToken(client, token, logger);
      
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.error
        });
        return;
      }

      // Attach validation result to request
      req.invitationValidation = validation;
      next();
    } finally {
      client.release();
    }
  } catch (error) {
    const logger = Logger.getInstance();
    logger.error('Invitation validation error', error as Error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during invitation validation'
    });
  }
};

/**
 * Validate invitation token against database
 */
async function validateInvitationToken(
  client: any,
  token: string,
  logger: Logger
): Promise<InvitationValidationResult> {
  try {
    const query = `
      SELECT ui.*, e.id as establishment_id, e.name as establishment_name, 
             e.email as establishment_email, e.status as establishment_status
      FROM user_invitations ui
      LEFT JOIN establishments e ON ui.establishment_id = e.id
      WHERE ui.invitation_token = $1 
        AND ui.status = 'pending'
        AND ui.expires_at > CURRENT_TIMESTAMP
    `;

    const result = await client.query(query, [token]);

    if (result.rows.length === 0) {
      return {
        isValid: false,
        token,
        error: 'Invalid or expired invitation token'
      };
    }

    const invitation = result.rows[0];

    if (!invitation.establishment_id) {
      return {
        isValid: false,
        token,
        error: 'Invitation not associated with an establishment'
      };
    }

    if (invitation.establishment_status === 'active') {
      return {
        isValid: false,
        token,
        error: 'Establishment setup already completed'
      };
    }

    return {
      isValid: true,
      token,
      establishment: {
        id: invitation.establishment_id,
        name: invitation.establishment_name,
        email: invitation.establishment_email,
        status: invitation.establishment_status
      }
    };
  } catch (error) {
    logger.error('Database error during invitation validation', error as Error);
    return {
      isValid: false,
      token,
      error: 'Database error during validation'
    };
  }
}
