/**
 * Setup Wizard Additional Types
 * Extended type definitions for wizard-specific functionality
 */

/**
 * Setup step execution result
 */
export interface SetupStepResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: Error;
}

/**
 * Setup transaction context
 */
export interface SetupTransactionContext {
  transactionId: string;
  client: any;
  context: any;
}

/**
 * Setup step configuration
 */
export interface SetupStepConfig {
  id: string;
  name: string;
  description: string;
  required: boolean;
  retryable: boolean;
  timeout?: number;
}

/**
 * Setup retry options
 */
export interface SetupRetryOptions {
  maxAttempts: number;
  delayMs: number;
  exponentialBackoff: boolean;
}

/**
 * Setup audit entry
 */
export interface SetupAuditEntry {
  user_id: number;
  establishment_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
}

/**
 * Setup cleanup options
 */
export interface SetupCleanupOptions {
  removeUser: boolean;
  removeEstablishment: boolean;
  removeDefaultData: boolean;
  removeAuditTrail: boolean;
}

/**
 * Setup execution metrics
 */
export interface SetupExecutionMetrics {
  totalDuration: number;
  stepDurations: Record<string, number>;
  errors: Array<{ step: string; error: string; timestamp: Date }>;
  retryCount: number;
}

/**
 * JWT token payload
 */
export interface SetupJwtPayload {
  userId: number;
  email: string;
  role: string;
  establishmentId: string;
}
