/**
 * Establishment Types
 * Centralized type definitions for all establishment services
 */

/**
 * Establishment status types
 */
export type EstablishmentStatus = 
  | 'pending_setup'      // Initial state after creation
  | 'setup_in_progress'  // Business owner started setup
  | 'active'             // Setup completed, establishment operational
  | 'suspended'          // Temporarily suspended
  | 'cancelled';         // Setup cancelled or establishment removed

/**
 * Setup step types
 */
export type SetupStepType = 
  | 'account_creation'      // Business owner account created
  | 'business_info'          // Basic business information
  | 'menu_setup'             // Menu and products configured
  | 'team_invitations'       // Team members invited
  | 'payment_setup'          // Payment methods configured
  | 'legal_compliance'       // Legal requirements met
  | 'final_verification';    // Final setup verification

/**
 * Setup step status
 */
export type SetupStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/**
 * Status transition request
 */
export interface StatusTransitionRequest {
  establishmentId: string;
  fromStatus: EstablishmentStatus;
  toStatus: EstablishmentStatus;
  reason?: string;
  notes?: string;
  approvedBy?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Status transition result
 */
export interface StatusTransitionResult {
  success: boolean;
  message: string;
  transitionId?: string;
  newStatus?: EstablishmentStatus;
  auditLogId?: string;
  errors?: string[];
}

/**
 * Setup progress interface
 */
export interface SetupProgress {
  establishmentId: string;
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  progressPercentage: number;
  estimatedTimeRemaining: number;
  lastUpdated: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'stalled';
}

/**
 * Setup step completion request
 */
export interface SetupStepCompletionRequest {
  establishmentId: string;
  stepType: SetupStepType;
  completedBy: string;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}
