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
export type TemplateData = Record<string, unknown>;

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
  ESTABLISHMENT_INVITATION = 'establishment_invitation',
  USER_INVITATION_REMINDER = 'user_invitation_reminder',
  ESTABLISHMENT_INVITATION_REMINDER = 'establishment_invitation_reminder',
  INVITATION_CANCELLED = 'invitation_cancelled',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  ESTABLISHMENT_SETUP = 'establishment_setup',
  ESTABLISHMENT_CREATED = 'establishment_created',
  RESERVATION_REQUESTED_GUEST = 'reservation_requested_guest',
  RESERVATION_REQUESTED_VENUE = 'reservation_requested_venue',
  RESERVATION_REMINDER_VENUE = 'reservation_reminder_venue',
  RESERVATION_CONFIRMED = 'reservation_confirmed',
  RESERVATION_REFUSED = 'reservation_refused',
  RESERVATION_ON_HOLD = 'reservation_on_hold',
  RESERVATION_CANCELLED_GUEST = 'reservation_cancelled_guest',
  RESERVATION_CANCELLED_VENUE = 'reservation_cancelled_venue',
  SHIFT_CONFIRMATION_EMPLOYEE = 'shift_confirmation_employee',
}
