/**
 * Setup Steps Configuration
 * Defines and manages establishment setup steps configuration
 */

import { SetupStepType } from '../types';

/**
 * Setup step interface
 */
export interface SetupStep {
  id: string;
  type: SetupStepType;
  name: string;
  description: string;
  isRequired: boolean;
  order: number;
  estimatedTimeMinutes: number;
}

/**
 * Setup Steps Configuration Class
 * Single responsibility: Define and provide setup steps configuration
 */
export class SetupStepsConfiguration {
  private static steps: SetupStep[];

  /**
   * Get all setup steps
   */
  public static getSteps(): SetupStep[] {
    if (!this.steps) {
      this.initializeSteps();
    }
    return this.steps;
  }

  /**
   * Get step by type
   */
  public static getStepByType(type: SetupStepType): SetupStep | undefined {
    return this.getSteps().find(step => step.type === type);
  }

  /**
   * Get required steps only
   */
  public static getRequiredSteps(): SetupStep[] {
    return this.getSteps().filter(step => step.isRequired);
  }

  /**
   * Get total estimated time for required steps
   */
  public static getTotalEstimatedTime(): number {
    return this.getRequiredSteps()
      .reduce((total, step) => total + step.estimatedTimeMinutes, 0);
  }

  /**
   * Get step order
   */
  public static getStepOrder(type: SetupStepType): number {
    const step = this.getStepByType(type);
    return step?.order || 0;
  }

  /**
   * Initialize setup steps configuration
   */
  private static initializeSteps(): void {
    this.steps = [
      {
        id: 'account_creation',
        type: 'account_creation',
        name: 'Account Creation',
        description: 'Create business owner account with secure credentials',
        isRequired: true,
        order: 1,
        estimatedTimeMinutes: 5
      },
      {
        id: 'business_info',
        type: 'business_info',
        name: 'Business Information',
        description: 'Configure business details, hours, and location',
        isRequired: true,
        order: 2,
        estimatedTimeMinutes: 10
      },
      {
        id: 'menu_setup',
        type: 'menu_setup',
        name: 'Menu Setup',
        description: 'Configure menu items, categories, and pricing',
        isRequired: true,
        order: 3,
        estimatedTimeMinutes: 30
      },
      {
        id: 'team_invitations',
        type: 'team_invitations',
        name: 'Team Invitations',
        description: 'Invite team members and assign roles',
        isRequired: false,
        order: 4,
        estimatedTimeMinutes: 15
      },
      {
        id: 'payment_setup',
        type: 'payment_setup',
        name: 'Payment Setup',
        description: 'Configure payment methods and tax settings',
        isRequired: true,
        order: 5,
        estimatedTimeMinutes: 20
      },
      {
        id: 'legal_compliance',
        type: 'legal_compliance',
        name: 'Legal Compliance',
        description: 'Verify legal requirements and documentation',
        isRequired: true,
        order: 6,
        estimatedTimeMinutes: 25
      },
      {
        id: 'final_verification',
        type: 'final_verification',
        name: 'Final Verification',
        description: 'Complete final setup verification and activation',
        isRequired: true,
        order: 7,
        estimatedTimeMinutes: 10
      }
    ];
  }
}
