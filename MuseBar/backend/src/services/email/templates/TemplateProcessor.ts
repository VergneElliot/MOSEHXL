/**
 * Template Processor
 * Handles variable replacement and template processing logic
 */

import { EmailTemplate, ProcessedTemplate, TemplateData } from './types';

/**
 * Template processing service
 */
export class TemplateProcessor {
  /**
   * Process template with data
   */
  public static processTemplate(
    template: EmailTemplate, 
    templateData: TemplateData
  ): ProcessedTemplate {
    return {
      subject: this.replaceTemplateVariables(template.subject, templateData),
      htmlBody: this.replaceTemplateVariables(template.htmlBody, templateData),
      textBody: template.textBody 
        ? this.replaceTemplateVariables(template.textBody, templateData)
        : undefined
    };
  }

  /**
   * Replace template variables in text
   */
  private static replaceTemplateVariables(text: string, data: TemplateData): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Validate template data against required variables
   */
  public static validateTemplateData(
    template: EmailTemplate, 
    templateData: TemplateData
  ): { isValid: boolean; missingVariables: string[] } {
    const missingVariables = template.variables.filter(
      variable => templateData[variable] === undefined || templateData[variable] === null
    );

    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  }

  /**
   * Extract variables from template text
   */
  public static extractVariables(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];

    return matches
      .map(match => match.replace(/[{}]/g, ''))
      .filter((variable, index, array) => array.indexOf(variable) === index); // Remove duplicates
  }

  /**
   * Preview template with sample data
   */
  public static previewTemplate(
    template: EmailTemplate,
    sampleData?: Partial<TemplateData>
  ): ProcessedTemplate {
    // Create sample data for all required variables
    const previewData: TemplateData = {};
    
    template.variables.forEach(variable => {
      if (sampleData && sampleData[variable] !== undefined) {
        previewData[variable] = sampleData[variable];
      } else {
        // Generate sample data based on variable name
        previewData[variable] = this.generateSampleValue(variable);
      }
    });

    return this.processTemplate(template, previewData);
  }

  /**
   * Generate sample value based on variable name
   */
  private static generateSampleValue(variableName: string): string {
    const sampleData: Record<string, string> = {
      recipientName: 'John Doe',
      establishmentName: 'Sample Restaurant',
      inviterName: 'Jane Manager',
      ownerName: 'Business Owner',
      invitationUrl: 'https://example.com/invitation/123',
      setupUrl: 'https://example.com/setup/456',
      resetUrl: 'https://example.com/reset/789',
      verificationUrl: 'https://example.com/verify/abc',
      expirationDate: '2025-02-15',
      expirationTime: '24 hours'
    };

    return sampleData[variableName] || `[${variableName}]`;
  }
}
