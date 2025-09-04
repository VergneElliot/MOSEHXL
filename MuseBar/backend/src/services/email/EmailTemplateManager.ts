/**
 * Email Template Manager
 * Re-exports modular email template components for backward compatibility
 */

// Re-export all components from the modular templates package
export { 
  EmailTemplateManager,
  BuiltInTemplates,
  TemplateProcessor
} from './templates';

// Re-export types for backward compatibility
export type {
  EmailTemplate,
  ProcessedTemplate,
  TemplateData,
  TemplateCategory,
  BuiltInTemplateId
} from './templates/types';

// Default export for backward compatibility
export { EmailTemplateManager as default } from './templates';