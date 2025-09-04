/**
 * Email Templates Module Entry Point
 * Exports all email template components
 */

export { EmailTemplateManager } from './EmailTemplateManager';
export { BuiltInTemplates } from './BuiltInTemplates';
export { TemplateProcessor } from './TemplateProcessor';
export * from './types';

// Default export for backward compatibility
export { EmailTemplateManager as default } from './EmailTemplateManager';
