/**
 * Built-in Email Templates
 * REFACTORED: Main template registry that delegates to specialized template modules
 * The original 425-line template collection has been modularized into:
 * - userInvitationTemplate.ts (User invitation emails)
 * - passwordResetTemplate.ts (Password reset emails)
 * - emailVerificationTemplate.ts (Email verification emails)
 * - establishmentSetupTemplate.ts (Setup completion emails)
 * - BuiltInTemplates.ts (Main registry)
 */

import { EmailTemplate, BuiltInTemplateId } from './types';
import { UserInvitationTemplate } from './userInvitationTemplate';
import { EstablishmentInvitationTemplate } from './establishmentInvitationTemplate';
import { UserInvitationReminderTemplate, EstablishmentInvitationReminderTemplate } from './invitationReminderTemplate';
import { InvitationCancelledTemplate } from './invitationCancelledTemplate';
import { PasswordResetTemplate } from './passwordResetTemplate';
import { EmailVerificationTemplate } from './emailVerificationTemplate';
import { EstablishmentSetupTemplate } from './establishmentSetupTemplate';
import { EstablishmentCreatedTemplate } from './establishmentCreatedTemplate';
import {
  ReservationRequestedGuestTemplate,
  ReservationRequestedVenueTemplate,
  ReservationReminderVenueTemplate,
  ReservationConfirmedTemplate,
  ReservationRefusedTemplate,
  ReservationOnHoldTemplate,
  ReservationCancelledGuestTemplate,
  ReservationCancelledVenueTemplate,
} from './reservationTemplates';
import { ShiftConfirmationEmployeeTemplate } from './shiftTemplates';

/**
 * Built-in email templates registry - delegates to specialized template modules
 */
export class BuiltInTemplates {
  
  /**
   * Get all built-in templates
   */
  public static getAllTemplates(): Map<string, EmailTemplate> {
    const templates = new Map<string, EmailTemplate>();

    // Add all templates to the map using specialized modules
    templates.set(BuiltInTemplateId.USER_INVITATION, UserInvitationTemplate.getTemplate());
    templates.set(BuiltInTemplateId.ESTABLISHMENT_INVITATION, EstablishmentInvitationTemplate.getTemplate());
    templates.set(BuiltInTemplateId.USER_INVITATION_REMINDER, UserInvitationReminderTemplate.getTemplate());
    templates.set(BuiltInTemplateId.ESTABLISHMENT_INVITATION_REMINDER, EstablishmentInvitationReminderTemplate.getTemplate());
    templates.set(BuiltInTemplateId.INVITATION_CANCELLED, InvitationCancelledTemplate.getTemplate());
    templates.set(BuiltInTemplateId.PASSWORD_RESET, PasswordResetTemplate.getTemplate());
    templates.set(BuiltInTemplateId.EMAIL_VERIFICATION, EmailVerificationTemplate.getTemplate());
    templates.set(BuiltInTemplateId.ESTABLISHMENT_SETUP, EstablishmentSetupTemplate.getTemplate());
    templates.set(BuiltInTemplateId.ESTABLISHMENT_CREATED, EstablishmentCreatedTemplate.getTemplate());
    templates.set(BuiltInTemplateId.RESERVATION_REQUESTED_GUEST, ReservationRequestedGuestTemplate.getTemplate());
    templates.set(BuiltInTemplateId.RESERVATION_REQUESTED_VENUE, ReservationRequestedVenueTemplate.getTemplate());
    templates.set(BuiltInTemplateId.RESERVATION_REMINDER_VENUE, ReservationReminderVenueTemplate.getTemplate());
    templates.set(BuiltInTemplateId.RESERVATION_CONFIRMED, ReservationConfirmedTemplate.getTemplate());
    templates.set(BuiltInTemplateId.RESERVATION_REFUSED, ReservationRefusedTemplate.getTemplate());
    templates.set(BuiltInTemplateId.RESERVATION_ON_HOLD, ReservationOnHoldTemplate.getTemplate());
    templates.set(BuiltInTemplateId.RESERVATION_CANCELLED_GUEST, ReservationCancelledGuestTemplate.getTemplate());
    templates.set(BuiltInTemplateId.RESERVATION_CANCELLED_VENUE, ReservationCancelledVenueTemplate.getTemplate());
    templates.set(BuiltInTemplateId.SHIFT_CONFIRMATION_EMPLOYEE, ShiftConfirmationEmployeeTemplate.getTemplate());

    return templates;
  }

  /**
   * Get a specific template by ID
   */
  public static getTemplate(templateId: BuiltInTemplateId): EmailTemplate | null {
    switch (templateId) {
      case BuiltInTemplateId.USER_INVITATION:
        return UserInvitationTemplate.getTemplate();
      case BuiltInTemplateId.ESTABLISHMENT_INVITATION:
        return EstablishmentInvitationTemplate.getTemplate();
      case BuiltInTemplateId.USER_INVITATION_REMINDER:
        return UserInvitationReminderTemplate.getTemplate();
      case BuiltInTemplateId.ESTABLISHMENT_INVITATION_REMINDER:
        return EstablishmentInvitationReminderTemplate.getTemplate();
      case BuiltInTemplateId.INVITATION_CANCELLED:
        return InvitationCancelledTemplate.getTemplate();
      case BuiltInTemplateId.PASSWORD_RESET:
        return PasswordResetTemplate.getTemplate();
      case BuiltInTemplateId.EMAIL_VERIFICATION:
        return EmailVerificationTemplate.getTemplate();
      case BuiltInTemplateId.ESTABLISHMENT_SETUP:
        return EstablishmentSetupTemplate.getTemplate();
      case BuiltInTemplateId.ESTABLISHMENT_CREATED:
        return EstablishmentCreatedTemplate.getTemplate();
      case BuiltInTemplateId.RESERVATION_REQUESTED_GUEST:
        return ReservationRequestedGuestTemplate.getTemplate();
      case BuiltInTemplateId.RESERVATION_REQUESTED_VENUE:
        return ReservationRequestedVenueTemplate.getTemplate();
      case BuiltInTemplateId.RESERVATION_REMINDER_VENUE:
        return ReservationReminderVenueTemplate.getTemplate();
      case BuiltInTemplateId.RESERVATION_CONFIRMED:
        return ReservationConfirmedTemplate.getTemplate();
      case BuiltInTemplateId.RESERVATION_REFUSED:
        return ReservationRefusedTemplate.getTemplate();
      case BuiltInTemplateId.RESERVATION_ON_HOLD:
        return ReservationOnHoldTemplate.getTemplate();
      case BuiltInTemplateId.RESERVATION_CANCELLED_GUEST:
        return ReservationCancelledGuestTemplate.getTemplate();
      case BuiltInTemplateId.RESERVATION_CANCELLED_VENUE:
        return ReservationCancelledVenueTemplate.getTemplate();
      case BuiltInTemplateId.SHIFT_CONFIRMATION_EMPLOYEE:
        return ShiftConfirmationEmployeeTemplate.getTemplate();
      default:
        return null;
    }
  }

  /**
   * Get template IDs for all built-in templates
   */
  public static getTemplateIds(): BuiltInTemplateId[] {
    return [
      BuiltInTemplateId.USER_INVITATION,
      BuiltInTemplateId.ESTABLISHMENT_INVITATION,
      BuiltInTemplateId.USER_INVITATION_REMINDER,
      BuiltInTemplateId.ESTABLISHMENT_INVITATION_REMINDER,
      BuiltInTemplateId.INVITATION_CANCELLED,
      BuiltInTemplateId.PASSWORD_RESET,
      BuiltInTemplateId.EMAIL_VERIFICATION,
      BuiltInTemplateId.ESTABLISHMENT_SETUP,
      BuiltInTemplateId.ESTABLISHMENT_CREATED,
      BuiltInTemplateId.RESERVATION_REQUESTED_GUEST,
      BuiltInTemplateId.RESERVATION_REQUESTED_VENUE,
      BuiltInTemplateId.RESERVATION_REMINDER_VENUE,
      BuiltInTemplateId.RESERVATION_CONFIRMED,
      BuiltInTemplateId.RESERVATION_REFUSED,
      BuiltInTemplateId.RESERVATION_ON_HOLD,
      BuiltInTemplateId.RESERVATION_CANCELLED_GUEST,
      BuiltInTemplateId.RESERVATION_CANCELLED_VENUE,
      BuiltInTemplateId.SHIFT_CONFIRMATION_EMPLOYEE,
    ];
  }

  /**
   * Check if a template ID is a built-in template
   */
  public static isBuiltInTemplate(templateId: string): boolean {
    return Object.values(BuiltInTemplateId).includes(templateId as BuiltInTemplateId);
  }

  /**
   * Get templates by category
   */
  public static getTemplatesByCategory(category: string): EmailTemplate[] {
    const allTemplates = this.getAllTemplates();
    const templates: EmailTemplate[] = [];
    
    for (const template of allTemplates.values()) {
      if (template.category === category) {
        templates.push(template);
      }
    }
    
    return templates;
  }

  /**
   * Get template count
   */
  public static getTemplateCount(): number {
    return this.getTemplateIds().length;
  }
}