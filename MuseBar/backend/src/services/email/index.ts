/**
 * Email Services Module
 * Clean exports for all email-related functionality
 */

// Main Email Service
export { EmailService } from './EmailService';

// Template Management
export { EmailTemplateManager, EmailTemplate } from './EmailTemplateManager';

// Email Logging and Tracking
export { EmailLogger, EmailLog, EmailStats } from './EmailLogger';

// Email Sending Core
export { EmailSender, EmailOptions, EmailConfigValidation } from './EmailSender';