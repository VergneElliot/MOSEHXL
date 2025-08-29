/**
 * Setup Service
 * REFACTORED: This service has been modularized into smaller, focused modules.
 * The original 567-line monolithic service has been broken down into:
 * - setupValidator.ts (Validation logic)
 * - setupDatabase.ts (DB operations)  
 * - setupDefaults.ts (Default data)
 * - setupWizard.ts (Wizard logic)
 * - SetupService.ts (Main orchestrator)
 * - types.ts (Type definitions)
 */

// Re-export the modular setup system for backward compatibility
export {
  SetupService,
  SetupValidator,
  SetupDatabase,
  SetupDefaults,
  SetupWizard,
  // Types
  type InvitationValidation,
  type BusinessSetupRequest,
  type BusinessSetupResponse,
  type SetupStatusResponse,
  type UserExistsResult,
  type InvitationData,
  type SetupValidationError,
  type SetupContext,
  type DefaultDataConfig,
  type TransactionContext,
  type SetupStep,
  type SetupWizardState,
  type SetupProgress
} from './setup/index';

// Default export for backward compatibility
export { default } from './setup/index';