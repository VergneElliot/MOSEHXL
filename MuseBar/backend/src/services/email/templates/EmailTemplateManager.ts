/**
 * Email Template Manager
 * Main template management service for handling email templates
 */

import { Logger } from '../../../utils/logger';
import { BuiltInTemplates } from './BuiltInTemplates';
import { TemplateProcessor } from './TemplateProcessor';
import { 
  EmailTemplate, 
  ProcessedTemplate, 
  TemplateData 
} from './types';

/**
 * Email Template Manager Class
 */
export class EmailTemplateManager {
  private logger: Logger;
  private templates: Map<string, EmailTemplate> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
    this.loadBuiltInTemplates();
  }

  /**
   * Load built-in email templates
   */
  private loadBuiltInTemplates(): void {
    this.templates = BuiltInTemplates.getAllTemplates();

    this.logger.info(
      'Built-in email templates loaded',
      { templateCount: this.templates.size },
      'EMAIL_TEMPLATE_MANAGER'
    );
  }

  /**
   * Get template by name
   */
  public getTemplate(templateName: string): EmailTemplate | null {
    return this.templates.get(templateName) || null;
  }

  /**
   * Get all available templates
   */
  public getAvailableTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add custom template
   */
  public addTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
    
    this.logger.info(
      'Custom email template added',
      { templateId: template.id, templateName: template.name },
      'EMAIL_TEMPLATE_MANAGER'
    );
  }

  /**
   * Update existing template
   */
  public updateTemplate(templateId: string, template: EmailTemplate): void {
    if (!this.templates.has(templateId)) {
      throw new Error(`Email template '${templateId}' not found`);
    }

    this.templates.set(templateId, template);
    
    this.logger.info(
      'Email template updated',
      { templateId: template.id, templateName: template.name },
      'EMAIL_TEMPLATE_MANAGER'
    );
  }

  /**
   * Remove template
   */
  public removeTemplate(templateId: string): boolean {
    const removed = this.templates.delete(templateId);
    
    if (removed) {
      this.logger.info(
        'Email template removed',
        { templateId },
        'EMAIL_TEMPLATE_MANAGER'
      );
    }

    return removed;
  }

  /**
   * Process template with data
   */
  public processTemplate(templateName: string, templateData: TemplateData): ProcessedTemplate {
    const template = this.getTemplate(templateName);
    
    if (!template) {
      const error = new Error(`Email template '${templateName}' not found`);
      this.logger.error(
        'Template processing failed - template not found',
        error,
        'EMAIL_TEMPLATE_MANAGER'
      );
      throw error;
    }

    // Validate template data
    const validation = TemplateProcessor.validateTemplateData(template, templateData);
    if (!validation.isValid) {
      const error = new Error(
        `Missing required template variables: ${validation.missingVariables.join(', ')}`
      );
      this.logger.error(
        'Template processing failed - missing variables',
        error,
        'EMAIL_TEMPLATE_MANAGER'
      );
      throw error;
    }

    try {
      const processed = TemplateProcessor.processTemplate(template, templateData);
      
      this.logger.debug(
        'Email template processed successfully',
        undefined,
        'EMAIL_TEMPLATE_MANAGER'
      );

      return processed;
    } catch (error) {
      this.logger.error(
        'Template processing failed',
        error as Error,
        'EMAIL_TEMPLATE_MANAGER'
      );
      throw error;
    }
  }

  /**
   * Preview template with sample data
   */
  public previewTemplate(templateName: string, sampleData?: Partial<TemplateData>): ProcessedTemplate {
    const template = this.getTemplate(templateName);
    
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    return TemplateProcessor.previewTemplate(template, sampleData);
  }

  /**
   * Validate template data without processing
   */
  public validateTemplateData(templateName: string, templateData: TemplateData): {
    isValid: boolean;
    missingVariables: string[];
  } {
    const template = this.getTemplate(templateName);
    
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    return TemplateProcessor.validateTemplateData(template, templateData);
  }

  /**
   * Get template statistics
   */
  public getStatistics(): {
    totalTemplates: number;
    builtInTemplates: number;
    customTemplates: number;
    templateNames: string[];
  } {
    const builtInIds = ['user_invitation', 'password_reset', 'email_verification', 'establishment_setup'];
    const customTemplates = Array.from(this.templates.keys()).filter(id => !builtInIds.includes(id));

    return {
      totalTemplates: this.templates.size,
      builtInTemplates: builtInIds.length,
      customTemplates: customTemplates.length,
      templateNames: Array.from(this.templates.keys())
    };
  }
}
