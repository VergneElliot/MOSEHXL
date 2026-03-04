/**
 * Establishment Invitation Template
 * Email sent when an establishment (business) is invited to join the platform
 */

import { EmailTemplate, BuiltInTemplateId } from './types';

/**
 * Establishment invitation email template (invite establishment to create account)
 */
export class EstablishmentInvitationTemplate {
  public static getTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.ESTABLISHMENT_INVITATION,
      name: 'Establishment Invitation',
      subject: 'Invitation to join MuseBar POS - {{establishmentName}}',
      variables: ['recipientName', 'establishmentName', 'inviterName', 'invitationUrl', 'expirationDate'],
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Establishment Invitation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; background: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MuseBar POS</h1>
            <h2>Your establishment has been invited</h2>
        </div>
        <div class="content">
            <h3>Hello {{recipientName}},</h3>
            <p><strong>{{inviterName}}</strong> has invited <strong>{{establishmentName}}</strong> to join MuseBar POS.</p>
            <p>To accept this invitation and set up your establishment account, click the button below:</p>
            <div style="text-align: center;">
                <a href="{{invitationUrl}}" class="button">Accept Invitation</a>
            </div>
            <div class="warning">
                <strong>Important:</strong> This invitation expires on <strong>{{expirationDate}}</strong>. Please complete registration before this date.
            </div>
            <p>If you cannot click the button, copy this link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 3px;">{{invitationUrl}}</p>
            <p>Best regards,<br>The MuseBar Team</p>
        </div>
        <div class="footer">
            <p>This is an automated message from MuseBar POS. If you did not expect this invitation, you can ignore this email.</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
Hello {{recipientName}},

{{inviterName}} has invited {{establishmentName}} to join MuseBar POS.

To accept this invitation, visit: {{invitationUrl}}

IMPORTANT: This invitation expires on {{expirationDate}}.

Best regards,
The MuseBar Team
      `.trim(),
      category: 'invitation',
      isBuiltIn: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
