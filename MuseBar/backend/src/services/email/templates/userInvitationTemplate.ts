/**
 * User Invitation Template
 * Email template for user invitations to join establishments
 */

import { EmailTemplate, BuiltInTemplateId } from './types';

/**
 * User invitation email template
 */
export class UserInvitationTemplate {
  
  /**
   * Get user invitation template
   */
  public static getTemplate(): EmailTemplate {
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
            margin: 20px 0; 
        }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 MuseBar POS</h1>
            <h2>You're Invited!</h2>
        </div>
        
        <div class="content">
            <h3>Hello {{recipientName}},</h3>
            
            <p>You have been invited by <strong>{{inviterName}}</strong> to join <strong>{{establishmentName}}</strong> on MuseBar POS.</p>
            
            <p>MuseBar POS is a comprehensive point-of-sale system designed specifically for bars and restaurants, offering:</p>
            <ul>
                <li>🍺 Complete order management</li>
                <li>📊 Real-time analytics and reporting</li>
                <li>💳 Integrated payment processing</li>
                <li>👥 Staff management tools</li>
                <li>📋 Inventory tracking</li>
                <li>⚖️ Legal compliance features</li>
            </ul>
            
            <p>To accept this invitation and set up your account, please click the button below:</p>
            
            <div style="text-align: center;">
                <a href="{{invitationUrl}}" class="button">Accept Invitation</a>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong> This invitation will expire on <strong>{{expirationDate}}</strong>. 
                Please complete your registration before this date.
            </div>
            
            <p>If you're unable to click the button above, you can copy and paste the following link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 3px;">
                {{invitationUrl}}
            </p>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Welcome to MuseBar POS!</p>
            
            <p>Best regards,<br>
            The MuseBar Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from MuseBar POS. Please do not reply to this email.</p>
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
Hello {{recipientName}},

You have been invited by {{inviterName}} to join {{establishmentName}} on MuseBar POS.

MuseBar POS is a comprehensive point-of-sale system designed specifically for bars and restaurants.

To accept this invitation and set up your account, please visit:
{{invitationUrl}}

IMPORTANT: This invitation will expire on {{expirationDate}}. Please complete your registration before this date.

If you have any questions or need assistance, please contact our support team.

Welcome to MuseBar POS!

Best regards,
The MuseBar Team

---
This is an automated message from MuseBar POS. Please do not reply to this email.
If you did not expect this invitation, you can safely ignore this email.
      `.trim(),
      category: 'user_management',
      isBuiltIn: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
