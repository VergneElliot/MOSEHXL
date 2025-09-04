/**
 * Password Reset Template
 * Email template for password reset requests
 */

import { EmailTemplate, BuiltInTemplateId } from './types';

/**
 * Password reset email template
 */
export class PasswordResetTemplate {
  
  /**
   * Get password reset template
   */
  public static getTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.PASSWORD_RESET,
      name: 'Password Reset',
      subject: 'Reset your password - MuseBar POS',
      variables: ['recipientName', 'resetUrl', 'expirationTime', 'ipAddress', 'userAgent'],
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff6b35; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { 
            display: inline-block; 
            background: #ff6b35; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
        }
        .security-info { background: #e3f2fd; border: 1px solid #2196f3; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .warning { background: #ffebee; border: 1px solid #f44336; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 MuseBar POS</h1>
            <h2>Password Reset Request</h2>
        </div>
        
        <div class="content">
            <h3>Hello {{recipientName}},</h3>
            
            <p>We received a request to reset the password for your MuseBar POS account.</p>
            
            <p>If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="{{resetUrl}}" class="button">Reset Password</a>
            </div>
            
            <div class="security-info">
                <strong>🛡️ Security Information:</strong>
                <ul>
                    <li>This password reset link will expire in <strong>{{expirationTime}}</strong></li>
                    <li>The link can only be used once</li>
                    <li>Request initiated from IP: {{ipAddress}}</li>
                </ul>
            </div>
            
            <p>If you're unable to click the button above, you can copy and paste the following link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 3px;">
                {{resetUrl}}
            </p>
            
            <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <p>If you did NOT request this password reset, please:</p>
                <ul>
                    <li>Ignore this email - your password will remain unchanged</li>
                    <li>Consider changing your password if you suspect unauthorized access</li>
                    <li>Contact our support team if you have concerns</li>
                </ul>
            </div>
            
            <p><strong>Password Security Tips:</strong></p>
            <ul>
                <li>Use a strong, unique password</li>
                <li>Include uppercase, lowercase, numbers, and symbols</li>
                <li>Don't reuse passwords from other accounts</li>
                <li>Consider using a password manager</li>
            </ul>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <p>Best regards,<br>
            The MuseBar Security Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated security message from MuseBar POS. Please do not reply to this email.</p>
            <p>Request details: IP {{ipAddress}} | {{userAgent}}</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
Hello {{recipientName}},

We received a request to reset the password for your MuseBar POS account.

If you made this request, please visit the following link to reset your password:
{{resetUrl}}

SECURITY INFORMATION:
- This password reset link will expire in {{expirationTime}}
- The link can only be used once
- Request initiated from IP: {{ipAddress}}

IMPORTANT: If you did NOT request this password reset, please ignore this email. Your password will remain unchanged.

Password Security Tips:
- Use a strong, unique password
- Include uppercase, lowercase, numbers, and symbols
- Don't reuse passwords from other accounts
- Consider using a password manager

If you have any questions or need assistance, please contact our support team.

Best regards,
The MuseBar Security Team

---
This is an automated security message from MuseBar POS. Please do not reply to this email.
Request details: IP {{ipAddress}} | {{userAgent}}
      `.trim(),
      category: 'security',
      isBuiltIn: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
