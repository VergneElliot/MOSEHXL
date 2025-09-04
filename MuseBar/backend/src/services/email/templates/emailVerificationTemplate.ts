/**
 * Email Verification Template
 * Email template for email address verification
 */

import { EmailTemplate, BuiltInTemplateId } from './types';

/**
 * Email verification template
 */
export class EmailVerificationTemplate {
  
  /**
   * Get email verification template
   */
  public static getTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.EMAIL_VERIFICATION,
      name: 'Email Verification',
      subject: 'Verify your email address - MuseBar POS',
      variables: ['recipientName', 'verificationUrl', 'expirationTime'],
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
            background: #4caf50; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
        }
        .info-box { background: #e8f5e8; border: 1px solid #4caf50; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✉️ MuseBar POS</h1>
            <h2>Verify Your Email Address</h2>
        </div>
        
        <div class="content">
            <h3>Hello {{recipientName}},</h3>
            
            <p>Thank you for creating your MuseBar POS account! To get started, we need to verify your email address.</p>
            
            <p>Please click the button below to verify your email address:</p>
            
            <div style="text-align: center;">
                <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
            </div>
            
            <div class="info-box">
                <strong>📋 What happens after verification?</strong>
                <ul>
                    <li>✅ Your account will be fully activated</li>
                    <li>🔓 You'll gain access to all MuseBar POS features</li>
                    <li>📧 You'll receive important system notifications</li>
                    <li>🛡️ Your account security will be enhanced</li>
                </ul>
            </div>
            
            <p>If you're unable to click the button above, you can copy and paste the following link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 3px;">
                {{verificationUrl}}
            </p>
            
            <p><strong>⏰ Time Sensitive:</strong> This verification link will expire in <strong>{{expirationTime}}</strong>. Please verify your email before then.</p>
            
            <p><strong>🔐 Why do we verify email addresses?</strong></p>
            <ul>
                <li>To ensure secure account recovery options</li>
                <li>To prevent unauthorized account creation</li>
                <li>To deliver important system notifications</li>
                <li>To maintain the integrity of our platform</li>
            </ul>
            
            <p>If you didn't create a MuseBar POS account, you can safely ignore this email.</p>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <p>Welcome to MuseBar POS!</p>
            
            <p>Best regards,<br>
            The MuseBar Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from MuseBar POS. Please do not reply to this email.</p>
            <p>If you didn't request this verification, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
Hello {{recipientName}},

Thank you for creating your MuseBar POS account! To get started, we need to verify your email address.

Please visit the following link to verify your email address:
{{verificationUrl}}

What happens after verification?
- Your account will be fully activated
- You'll gain access to all MuseBar POS features
- You'll receive important system notifications
- Your account security will be enhanced

IMPORTANT: This verification link will expire in {{expirationTime}}. Please verify your email before then.

Why do we verify email addresses?
- To ensure secure account recovery options
- To prevent unauthorized account creation
- To deliver important system notifications
- To maintain the integrity of our platform

If you didn't create a MuseBar POS account, you can safely ignore this email.

If you have any questions or need assistance, please contact our support team.

Welcome to MuseBar POS!

Best regards,
The MuseBar Team

---
This is an automated message from MuseBar POS. Please do not reply to this email.
If you didn't request this verification, you can safely ignore this email.
      `.trim(),
      category: 'account_management',
      isBuiltIn: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
