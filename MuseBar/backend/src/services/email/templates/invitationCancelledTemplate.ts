/**
 * Invitation Cancelled Template
 * Email sent when an invitation is cancelled by the inviter
 */

import { EmailTemplate, BuiltInTemplateId } from './types';

/**
 * Invitation cancelled notification template
 */
export class InvitationCancelledTemplate {
  public static getTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.INVITATION_CANCELLED,
      name: 'Invitation Cancelled',
      subject: 'Invitation cancelled - MuseBar POS',
      variables: ['recipientName', 'establishmentName', 'inviterName', 'role'],
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invitation Cancelled</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #757575; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f9f9f9; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Invitation Cancelled</h1>
        </div>
        <div class="content">
            <h3>Hello {{recipientName}},</h3>
            <p>The invitation from <strong>{{inviterName}}</strong> to join <strong>{{establishmentName}}</strong> on MuseBar POS has been cancelled.</p>
            <p>If you have questions, please contact {{inviterName}} or your establishment administrator.</p>
            <p>Best regards,<br>The MuseBar Team</p>
        </div>
        <div class="footer">
            <p>This is an automated message from MuseBar POS.</p>
        </div>
    </div>
</body>
</html>`,
      textBody: `
Hello {{recipientName}},

The invitation from {{inviterName}} to join {{establishmentName}} on MuseBar POS has been cancelled.

If you have questions, please contact {{inviterName}} or your establishment administrator.

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
