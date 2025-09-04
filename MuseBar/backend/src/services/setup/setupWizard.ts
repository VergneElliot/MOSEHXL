/**
 * Setup Wizard - Legacy Entry Point
 * Re-exports modular wizard components for backward compatibility
 */

// Re-export all components from the modular wizard package
export { 
  SetupWizard,
  SetupStepProcessor,
  SetupProgressTracker,
  SetupAuthManager,
  SetupAuditManager
} from './wizard';

// Re-export types for backward compatibility
export type {
  SetupStepResult,
  SetupTransactionContext,
  SetupStepConfig,
  SetupRetryOptions,
  SetupAuditEntry,
  SetupCleanupOptions,
  SetupExecutionMetrics,
  SetupJwtPayload
} from './wizard/types';

// Default export for backward compatibility
export { SetupWizard as default } from './wizard';

