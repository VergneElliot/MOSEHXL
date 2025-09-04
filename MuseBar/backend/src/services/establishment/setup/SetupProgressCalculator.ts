/**
 * Setup Progress Calculator
 * Calculates and manages establishment setup progress metrics
 */

import { SetupProgress } from '../types';
import { SetupStepsConfiguration } from './SetupStepsConfiguration';

/**
 * Progress calculation result interface
 */
export interface ProgressCalculationResult {
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  progressPercentage: number;
  estimatedTimeRemaining: number;
  status: SetupProgress['status'];
}

/**
 * Setup Progress Calculator Class
 * Single responsibility: Calculate setup progress metrics
 */
export class SetupProgressCalculator {
  /**
   * Calculate progress from step counts
   */
  public static calculateProgress(
    completedSteps: number,
    skippedSteps: number,
    totalSteps: number
  ): ProgressCalculationResult {
    const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
    
    // Determine status
    let status: SetupProgress['status'] = 'not_started';
    if (completedSteps > 0) status = 'in_progress';
    if (completedSteps === totalSteps) status = 'completed';
    if (completedSteps === 0 && skippedSteps > 0) status = 'stalled';

    // Calculate estimated time remaining
    const estimatedTimeRemaining = this.calculateRemainingTime(completedSteps, skippedSteps);

    return {
      totalSteps,
      completedSteps,
      skippedSteps,
      progressPercentage,
      estimatedTimeRemaining,
      status
    };
  }

  /**
   * Calculate remaining estimated time
   */
  private static calculateRemainingTime(completedSteps: number, skippedSteps: number): number {
    const steps = SetupStepsConfiguration.getSteps();
    const remainingSteps = steps
      .filter(step => step.isRequired)
      .slice(completedSteps + skippedSteps);

    return remainingSteps.reduce((total, step) => total + step.estimatedTimeMinutes, 0);
  }

  /**
   * Get total estimated setup time
   */
  public static getTotalEstimatedTime(): number {
    return SetupStepsConfiguration.getTotalEstimatedTime();
  }

  /**
   * Calculate progress percentage
   */
  public static calculatePercentage(completed: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }

  /**
   * Check if setup is complete
   */
  public static isSetupComplete(completedSteps: number, totalSteps: number): boolean {
    return completedSteps === totalSteps;
  }

  /**
   * Check if setup is stalled
   */
  public static isSetupStalled(completedSteps: number, skippedSteps: number): boolean {
    return completedSteps === 0 && skippedSteps > 0;
  }

  /**
   * Get next incomplete step
   */
  public static getNextIncompleteStep(completedSteps: number, skippedSteps: number): number {
    return completedSteps + skippedSteps + 1;
  }
}
