/**
 * Setup Service Module - Clean Exports
 * Provides a modular setup system for business establishment configuration
 */

// Core classes
export { SetupValidator } from './setupValidator';
export { SetupDatabase } from './setupDatabase';
export { SetupDefaults } from './setupDefaults';
export { SetupWizard } from './setupWizard';

// Types
export type {
  InvitationValidation,
  BusinessSetupRequest,
  BusinessSetupResponse,
  SetupStatusResponse,
  UserExistsResult,
  InvitationData,
  SetupValidationError,
  SetupContext,
  DefaultDataConfig,
  TransactionContext,
  SetupStep,
  SetupWizardState,
  SetupProgress
} from './types';

// Main service class
export { SetupService } from './SetupService';

// Default export for backward compatibility
export { SetupService as default } from './SetupService';

