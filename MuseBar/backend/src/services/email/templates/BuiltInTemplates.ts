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
import { PasswordResetTemplate } from './passwordResetTemplate';
import { EmailVerificationTemplate } from './emailVerificationTemplate';
import { EstablishmentSetupTemplate } from './establishmentSetupTemplate';
import { EstablishmentCreatedTemplate } from './establishmentCreatedTemplate';

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
    templates.set(BuiltInTemplateId.PASSWORD_RESET, PasswordResetTemplate.getTemplate());
    templates.set(BuiltInTemplateId.EMAIL_VERIFICATION, EmailVerificationTemplate.getTemplate());
    templates.set(BuiltInTemplateId.ESTABLISHMENT_SETUP, EstablishmentSetupTemplate.getTemplate());
    templates.set(BuiltInTemplateId.ESTABLISHMENT_CREATED, EstablishmentCreatedTemplate.getTemplate());

    return templates;
  }

  /**
   * Get a specific template by ID
   */
  public static getTemplate(templateId: BuiltInTemplateId): EmailTemplate | null {
    switch (templateId) {
      case BuiltInTemplateId.USER_INVITATION:
        return UserInvitationTemplate.getTemplate();
      
      case BuiltInTemplateId.PASSWORD_RESET:
        return PasswordResetTemplate.getTemplate();
      
      case BuiltInTemplateId.EMAIL_VERIFICATION:
        return EmailVerificationTemplate.getTemplate();
      
      case BuiltInTemplateId.ESTABLISHMENT_SETUP:
        return EstablishmentSetupTemplate.getTemplate();
      
      case BuiltInTemplateId.ESTABLISHMENT_CREATED:
        return EstablishmentCreatedTemplate.getTemplate();
      
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
      BuiltInTemplateId.PASSWORD_RESET,
      BuiltInTemplateId.EMAIL_VERIFICATION,
      BuiltInTemplateId.ESTABLISHMENT_SETUP,
      BuiltInTemplateId.ESTABLISHMENT_CREATED
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