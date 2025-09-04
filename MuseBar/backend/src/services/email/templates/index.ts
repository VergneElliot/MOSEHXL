/**
 * Email Templates Module Entry Point
 * UPDATED: Exports all email template components including specialized template modules
 * Maintains backward compatibility while providing access to focused modules
 */

export { EmailTemplateManager } from './EmailTemplateManager';
export { BuiltInTemplates } from './BuiltInTemplates';
export { TemplateProcessor } from './TemplateProcessor';

// Specialized template modules
export { UserInvitationTemplate } from './userInvitationTemplate';
export { PasswordResetTemplate } from './passwordResetTemplate';
export { EmailVerificationTemplate } from './emailVerificationTemplate';
export { EstablishmentSetupTemplate } from './establishmentSetupTemplate';

// Types
export * from './types';

// Default export for backward compatibility
export { EmailTemplateManager as default } from './EmailTemplateManager';
