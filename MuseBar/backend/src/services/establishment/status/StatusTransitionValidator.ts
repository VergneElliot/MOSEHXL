/**
 * Status Transition Validator
 * Validates establishment status transition requests
 */

import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { EstablishmentStatus, StatusTransitionRequest } from '../types';
import { StatusTransitionRules } from './StatusTransitionRules';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  rule?: any;
  errors: string[];
}

/**
 * Status Transition Validator Class
 * Single responsibility: Validate status transition requests
 */
export class StatusTransitionValidator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Validate status transition request
   */
  public async validateTransitionRequest(
    client: PoolClient,
    request: StatusTransitionRequest
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validate transition rule
    const rule = StatusTransitionRules.getRule(request.fromStatus, request.toStatus);
    if (!rule) {
      errors.push(`Invalid status transition from '${request.fromStatus}' to '${request.toStatus}'`);
    } else if (!rule.allowed) {
      errors.push(`Status transition from '${request.fromStatus}' to '${request.toStatus}' is not allowed`);
    }

    // Check approval requirements
    if (rule?.requiresApproval && !request.approvedBy) {
      errors.push('Approval required for this status transition');
    }

    // Verify current status matches
    try {
      const currentStatus = await this.getCurrentStatus(client, request.establishmentId);
      if (currentStatus !== request.fromStatus) {
        errors.push(`Expected status: ${request.fromStatus}, Current status: ${currentStatus}`);
      }
    } catch (error) {
      errors.push('Failed to verify current establishment status');
    }

    const isValid = errors.length === 0;

    if (!isValid) {
      this.logger.warn(
        'Status transition validation failed',
        { errors, request },
        'STATUS_TRANSITION_VALIDATOR'
      );
    }

    return {
      isValid,
      rule,
      errors
    };
  }

  /**
   * Get current establishment status
   */
  private async getCurrentStatus(client: PoolClient, establishmentId: string): Promise<EstablishmentStatus> {
    const query = 'SELECT status FROM establishments WHERE id = $1';
    const result = await client.query(query, [establishmentId]);
    
    if (result.rows.length === 0) {
      throw new Error('Establishment not found');
    }

    return result.rows[0].status as EstablishmentStatus;
  }

  /**
   * Validate status format
   */
  public static isValidStatus(status: string): status is EstablishmentStatus {
    const validStatuses: EstablishmentStatus[] = [
      'pending_setup',
      'setup_in_progress', 
      'active',
      'suspended',
      'cancelled'
    ];
    return validStatuses.includes(status as EstablishmentStatus);
  }
}
