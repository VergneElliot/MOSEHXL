/**
 * Setup Wizard Module Entry Point
 * UPDATED: Exports all wizard components including new modular step processors
 * Maintains backward compatibility while providing access to specialized processors
 */

export { SetupWizard } from './SetupWizard';
export { SetupStepProcessor } from './SetupStepProcessor';
export { ValidationStepProcessor } from './validationStepProcessor';
export { UserStepProcessor } from './userStepProcessor';
export { DataStepProcessor } from './dataStepProcessor';
export { CompletionStepProcessor } from './completionStepProcessor';
export { SetupProgressTracker } from './SetupProgressTracker';
export { SetupAuthManager } from './SetupAuthManager';
export { SetupAuditManager } from './SetupAuditManager';
export * from './types';

// Default export for backward compatibility
export { SetupWizard as default } from './SetupWizard';