/**
 * Invitation Reminder Templates
 * Reminder emails for pending user and establishment invitations
 */

import { EmailTemplate, BuiltInTemplateId } from './types';

const sharedVariables = ['recipientName', 'establishmentName', 'inviterName', 'invitationUrl', 'expirationDate'];

const reminderHtmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invitation Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .button { display: inline-block; background: #4caf50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reminder: Your invitation is still pending</h1>
        </div>
        <div class="content">
            <h3>Hello {{recipientName}},</h3>
            <p>This is a friendly reminder that you have a pending invitation from <strong>{{inviterName}}</strong> to join <strong>{{establishmentName}}</strong> on MuseBar POS.</p>
            <p>To accept the invitation, click the button below:</p>
            <div style="text-align: center;">
                <a href="{{invitationUrl}}" class="button">Accept Invitation</a>
            </div>
            <div class="warning">
                <strong>This invitation expires on {{expirationDate}}.</strong> Please complete your registration before this date.
            </div>
            <p>If you cannot click the button, copy this link: {{invitationUrl}}</p>
            <p>Best regards,<br>The MuseBar Team</p>
        </div>
        <div class="footer">
            <p>This is an automated reminder from MuseBar POS.</p>
        </div>
    </div>
</body>
</html>`;

const reminderTextBody = `
Hello {{recipientName}},

Reminder: You have a pending invitation from {{inviterName}} to join {{establishmentName}} on MuseBar POS.

Accept here: {{invitationUrl}}

This invitation expires on {{expirationDate}}.

Best regards,
The MuseBar Team
`.trim();

/**
 * User invitation reminder (for invited staff/cashiers)
 */
export class UserInvitationReminderTemplate {
  public static getTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.USER_INVITATION_REMINDER,
      name: 'User Invitation Reminder',
      subject: 'Reminder: Your invitation to join {{establishmentName}} - MuseBar POS',
      variables: [...sharedVariables],
      htmlBody: reminderHtmlBody,
      textBody: reminderTextBody,
      category: 'invitation',
      isBuiltIn: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}

/**
 * Establishment invitation reminder (for invited establishment owners)
 */
export class EstablishmentInvitationReminderTemplate {
  public static getTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.ESTABLISHMENT_INVITATION_REMINDER,
      name: 'Establishment Invitation Reminder',
      subject: 'Reminder: Your invitation to join MuseBar POS - {{establishmentName}}',
      variables: [...sharedVariables],
      htmlBody: reminderHtmlBody,
      textBody: reminderTextBody,
      category: 'invitation',
      isBuiltIn: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
