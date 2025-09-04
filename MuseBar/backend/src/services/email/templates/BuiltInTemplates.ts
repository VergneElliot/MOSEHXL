/**
 * Built-in Email Templates
 * Contains all default email templates for the system
 */

import { EmailTemplate, BuiltInTemplateId } from './types';

/**
 * Built-in email templates collection
 */
export class BuiltInTemplates {
  /**
   * Get all built-in templates
   */
  public static getAllTemplates(): Map<string, EmailTemplate> {
    const templates = new Map<string, EmailTemplate>();

    // Add all templates to the map
    templates.set(BuiltInTemplateId.USER_INVITATION, this.getUserInvitationTemplate());
    templates.set(BuiltInTemplateId.PASSWORD_RESET, this.getPasswordResetTemplate());
    templates.set(BuiltInTemplateId.EMAIL_VERIFICATION, this.getEmailVerificationTemplate());
    templates.set(BuiltInTemplateId.ESTABLISHMENT_SETUP, this.getEstablishmentSetupTemplate());

    return templates;
  }

  /**
   * User invitation template
   */
  private static getUserInvitationTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.USER_INVITATION,
      name: 'User Invitation',
      subject: 'Invitation to join {{establishmentName}} - MuseBar POS',
      variables: ['recipientName', 'establishmentName', 'inviterName', 'invitationUrl', 'expirationDate'],
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>User Invitation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { 
            display: inline-block; 
            background: #4caf50; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px;
            font-weight: bold;
        }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍺 MuseBar POS System</h1>
        </div>
        <div class="content">
            <h2>You've been invited!</h2>
            <p>Hello {{recipientName}},</p>
            <p>{{inviterName}} has invited you to join <strong>{{establishmentName}}</strong> on the MuseBar POS system.</p>
            
            <p>Click the button below to accept your invitation and set up your account:</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="{{invitationUrl}}" class="button">Accept Invitation</a>
            </p>
            
            <p><strong>Important:</strong> This invitation expires on {{expirationDate}}.</p>
            
            <p>If you have any questions, please contact your manager or system administrator.</p>
            
            <p>Best regards,<br>The MuseBar Team</p>
        </div>
        <div class="footer">
            <p>© 2025 MuseBar POS System. All rights reserved.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
You've been invited to join {{establishmentName}} - MuseBar POS

Hello {{recipientName}},

{{inviterName}} has invited you to join {{establishmentName}} on the MuseBar POS system.

Please visit the following link to accept your invitation and set up your account:
{{invitationUrl}}

Important: This invitation expires on {{expirationDate}}.

If you have any questions, please contact your manager or system administrator.

Best regards,
The MuseBar Team

© 2025 MuseBar POS System. All rights reserved.
If you didn't expect this invitation, you can safely ignore this email.
`
    };
  }

  /**
   * Password reset template
   */
  private static getPasswordResetTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.PASSWORD_RESET,
      name: 'Password Reset',
      subject: 'Reset your MuseBar password',
      variables: ['recipientName', 'resetUrl', 'expirationTime'],
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { 
            display: inline-block; 
            background: #ff5722; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px;
            font-weight: bold;
        }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset</h1>
        </div>
        <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello {{recipientName}},</p>
            <p>We received a request to reset your password for your MuseBar account.</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="{{resetUrl}}" class="button">Reset Password</a>
            </p>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                    <li>This link expires in {{expirationTime}}</li>
                    <li>The link can only be used once</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                </ul>
            </div>
            
            <p>For security reasons, we recommend choosing a strong password that includes:</p>
            <ul>
                <li>At least 8 characters</li>
                <li>Mix of uppercase and lowercase letters</li>
                <li>Numbers and special characters</li>
            </ul>
            
            <p>Best regards,<br>The MuseBar Team</p>
        </div>
        <div class="footer">
            <p>© 2025 MuseBar POS System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
Reset Your MuseBar Password

Hello {{recipientName}},

We received a request to reset your password for your MuseBar account.

Please visit the following link to reset your password:
{{resetUrl}}

Security Notice:
- This link expires in {{expirationTime}}
- The link can only be used once
- If you didn't request this reset, please ignore this email

For security reasons, we recommend choosing a strong password that includes:
- At least 8 characters
- Mix of uppercase and lowercase letters  
- Numbers and special characters

Best regards,
The MuseBar Team

© 2025 MuseBar POS System. All rights reserved.
`
    };
  }

  /**
   * Email verification template
   */
  private static getEmailVerificationTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.EMAIL_VERIFICATION,
      name: 'Email Verification',
      subject: 'Verify your email address - MuseBar POS',
      variables: ['recipientName', 'verificationUrl', 'establishmentName'],
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Email Verification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4caf50; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { 
            display: inline-block; 
            background: #2196f3; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px;
            font-weight: bold;
        }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✉️ Verify Your Email</h1>
        </div>
        <div class="content">
            <h2>Welcome to MuseBar!</h2>
            <p>Hello {{recipientName}},</p>
            <p>Welcome to <strong>{{establishmentName}}</strong>! To complete your account setup, please verify your email address.</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
            </p>
            
            <p>This verification link will expire in 24 hours for security reasons.</p>
            
            <p>Once verified, you'll have full access to your MuseBar account features.</p>
            
            <p>Best regards,<br>The MuseBar Team</p>
        </div>
        <div class="footer">
            <p>© 2025 MuseBar POS System. All rights reserved.</p>
            <p>If you didn't create this account, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
Welcome to MuseBar - Verify Your Email

Hello {{recipientName}},

Welcome to {{establishmentName}}! To complete your account setup, please verify your email address.

Please visit the following link to verify your email:
{{verificationUrl}}

This verification link will expire in 24 hours for security reasons.

Once verified, you'll have full access to your MuseBar account features.

Best regards,
The MuseBar Team

© 2025 MuseBar POS System. All rights reserved.
If you didn't create this account, you can safely ignore this email.
`
    };
  }

  /**
   * Establishment setup template
   */
  private static getEstablishmentSetupTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.ESTABLISHMENT_SETUP,
      name: 'Establishment Setup Invitation',
      subject: 'Set up your business POS system - {{establishmentName}}',
      variables: ['ownerName', 'establishmentName', 'inviterName', 'setupUrl', 'expirationDate'],
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Business Setup Invitation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { 
            display: inline-block; 
            background: #4caf50; 
            color: white; 
            padding: 15px 40px; 
            text-decoration: none; 
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
        }
        .highlight { background: #e3f2fd; padding: 20px; border-radius: 5px; border-left: 4px solid #1976d2; margin: 20px 0; }
        .features { background: #f1f8e9; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏪 Welcome to MOSEHXL</h1>
            <p>Professional POS Management System</p>
        </div>
        <div class="content">
            <h2>Your Business POS System is Ready!</h2>
            <p>Hello {{ownerName}},</p>
            
            <div class="highlight">
                <p><strong>{{inviterName}}</strong> has created a dedicated POS management system for <strong>{{establishmentName}}</strong>.</p>
            </div>
            
            <p>You're just one step away from accessing your complete business management solution!</p>
            
            <div class="features">
                <h3>🎯 What's included in your system:</h3>
                <ul>
                    <li><strong>Point of Sale (POS)</strong> - Process orders and payments</li>
                    <li><strong>Menu Management</strong> - Add products, categories, and pricing</li>
                    <li><strong>Happy Hour Settings</strong> - Automated promotions</li>
                    <li><strong>User Management</strong> - Add staff and manage permissions</li>
                    <li><strong>Transaction History</strong> - Complete sales reporting</li>
                    <li><strong>Legal Compliance</strong> - French regulations compliance</li>
                </ul>
            </div>
            
            <p>Click the button below to complete your business setup:</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="{{setupUrl}}" class="button">Complete Business Setup</a>
            </p>
            
            <div class="highlight">
                <p><strong>⏰ Important:</strong> This setup link expires on {{expirationDate}}.</p>
                <p><strong>📝 You'll need to provide:</strong></p>
                <ul>
                    <li>Business legal name and contact information</li>
                    <li>TVA number (if applicable)</li>
                    <li>SIRET number</li>
                    <li>Your secure password for the system</li>
                </ul>
            </div>
            
            <p>Once setup is complete, you'll have your own dedicated business management platform with all the tools you need to run your establishment efficiently.</p>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <p>Best regards,<br>The MOSEHXL Team</p>
        </div>
        <div class="footer">
            <p>© 2025 MOSEHXL Professional POS System. All rights reserved.</p>
            <p>If you didn't expect this invitation, please contact the sender directly.</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
Your Business POS System is Ready! - {{establishmentName}}

Hello {{ownerName}},

{{inviterName}} has created a dedicated POS management system for {{establishmentName}}.

You're just one step away from accessing your complete business management solution!

What's included in your system:
- Point of Sale (POS) - Process orders and payments
- Menu Management - Add products, categories, and pricing  
- Happy Hour Settings - Automated promotions
- User Management - Add staff and manage permissions
- Transaction History - Complete sales reporting
- Legal Compliance - French regulations compliance

Please visit the following link to complete your business setup:
{{setupUrl}}

Important: This setup link expires on {{expirationDate}}.

You'll need to provide:
- Business legal name and contact information
- TVA number (if applicable)
- SIRET number
- Your secure password for the system

Once setup is complete, you'll have your own dedicated business management platform with all the tools you need to run your establishment efficiently.

If you have any questions or need assistance, please contact our support team.

Best regards,
The MOSEHXL Team

© 2025 MOSEHXL Professional POS System. All rights reserved.
If you didn't expect this invitation, please contact the sender directly.
`
    };
  }
}
