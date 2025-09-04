/**
 * Setup Service Module - Clean Exports
 * UPDATED: Provides a modular setup system with specialized database operation modules
 * Maintains backward compatibility while providing access to focused modules
 */

// Core classes
export { SetupValidator } from './setupValidator';
export { SetupDatabase } from './setupDatabase';
export { SetupDefaults } from './setupDefaults';
export { SetupWizard } from './setupWizard';

// Specialized database operation modules
export { InvitationOperations } from './invitationOperations';
export { UserAccountOperations } from './userAccountOperations';
export { EstablishmentOperations } from './establishmentOperations';
export { TransactionOperations } from './transactionOperations';

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

