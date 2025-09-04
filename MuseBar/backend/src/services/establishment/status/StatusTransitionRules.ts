/**
 * Status Transition Rules
 * Defines and manages establishment status transition rules
 */

import { EstablishmentStatus } from '../types';

/**
 * Status transition rule interface
 */
export interface StatusTransitionRule {
  from: EstablishmentStatus;
  to: EstablishmentStatus;
  allowed: boolean;
  requiresApproval?: boolean;
  validationRules?: string[];
  notes?: string;
}

/**
 * Status Transition Rules Class
 * Single responsibility: Define and provide transition rules
 */
export class StatusTransitionRules {
  private static rules: Map<string, StatusTransitionRule>;

  /**
   * Get all transition rules
   */
  public static getRules(): Map<string, StatusTransitionRule> {
    if (!this.rules) {
      this.initializeRules();
    }
    return this.rules;
  }

  /**
   * Get specific transition rule
   */
  public static getRule(fromStatus: EstablishmentStatus, toStatus: EstablishmentStatus): StatusTransitionRule | undefined {
    const key = `${fromStatus}->${toStatus}`;
    return this.getRules().get(key);
  }

  /**
   * Check if transition is allowed
   */
  public static isTransitionAllowed(fromStatus: EstablishmentStatus, toStatus: EstablishmentStatus): boolean {
    const rule = this.getRule(fromStatus, toStatus);
    return rule?.allowed || false;
  }

  /**
   * Check if transition requires approval
   */
  public static requiresApproval(fromStatus: EstablishmentStatus, toStatus: EstablishmentStatus): boolean {
    const rule = this.getRule(fromStatus, toStatus);
    return rule?.requiresApproval || false;
  }

  /**
   * Get available transitions for current status
   */
  public static getAvailableTransitions(currentStatus: EstablishmentStatus): EstablishmentStatus[] {
    const available: EstablishmentStatus[] = [];
    
    this.getRules().forEach((rule, key) => {
      if (key.startsWith(`${currentStatus}->`) && rule.allowed) {
        available.push(rule.to);
      }
    });

    return available;
  }

  /**
   * Initialize transition rules
   */
  private static initializeRules(): void {
    this.rules = new Map();

    const rules: StatusTransitionRule[] = [
      {
        from: 'pending_setup',
        to: 'setup_in_progress',
        allowed: true,
        notes: 'Business owner started setup process'
      },
      {
        from: 'pending_setup',
        to: 'cancelled',
        allowed: true,
        requiresApproval: true,
        notes: 'Setup cancelled by system admin'
      },
      {
        from: 'setup_in_progress',
        to: 'active',
        allowed: true,
        notes: 'Setup completed successfully'
      },
      {
        from: 'setup_in_progress',
        to: 'cancelled',
        allowed: true,
        requiresApproval: true,
        notes: 'Setup cancelled during progress'
      },
      {
        from: 'active',
        to: 'suspended',
        allowed: true,
        requiresApproval: true,
        notes: 'Establishment temporarily suspended'
      },
      {
        from: 'suspended',
        to: 'active',
        allowed: true,
        notes: 'Suspension lifted'
      },
      {
        from: 'suspended',
        to: 'cancelled',
        allowed: true,
        requiresApproval: true,
        notes: 'Establishment cancelled while suspended'
      }
    ];

    // Add rules to map
    rules.forEach(rule => {
      const key = `${rule.from}->${rule.to}`;
      this.rules.set(key, rule);
    });
  }
}
