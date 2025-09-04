/**
 * Setup Wizard Module Entry Point
 * Exports all wizard components and maintains backward compatibility
 */

export { SetupWizard } from './SetupWizard';
export { SetupStepProcessor } from './SetupStepProcessor';
export { SetupProgressTracker } from './SetupProgressTracker';
export { SetupAuthManager } from './SetupAuthManager';
export { SetupAuditManager } from './SetupAuditManager';
export * from './types';

// Default export for backward compatibility
export { SetupWizard as default } from './SetupWizard';