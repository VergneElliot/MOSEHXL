/**
 * Email Template Types
 * Type definitions for email templates and processing
 */

/**
 * Email template interface
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables: string[];
  category?: string;
  isBuiltIn?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Processed email template result
 */
export interface ProcessedTemplate {
  subject: string;
  htmlBody: string;
  textBody?: string;
}

/**
 * Template processing data
 */
export type TemplateData = Record<string, any>;

/**
 * Template categories for organization
 */
export enum TemplateCategory {
  AUTHENTICATION = 'authentication',
  INVITATION = 'invitation',
  BUSINESS = 'business',
  NOTIFICATION = 'notification'
}

/**
 * Built-in template identifiers
 */
export enum BuiltInTemplateId {
  USER_INVITATION = 'user_invitation',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  ESTABLISHMENT_SETUP = 'establishment_setup'
}
