/**
 * Reservation status email templates (FR).
 * Guest-facing mail is sent from {slug}@mosehxl.com so replies reach the venue inbox.
 */

import { EmailTemplate, BuiltInTemplateId } from './types';

const baseStyles = `
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: #1a237e; color: white; padding: 20px; text-align: center; }
  .content { padding: 24px; background: #f9f9f9; }
  .detail { background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #1a237e; }
  .footer { text-align: center; margin-top: 24px; color: #666; font-size: 12px; }
  .commentaire { background: #e8f5e9; border: 1px solid #a5d6a7; padding: 12px; border-radius: 4px; margin: 12px 0; white-space: pre-wrap; }
  .button { display: inline-block; background: #1a237e; color: #fff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 12px 0; }
  .hint { background: #fff8e1; border: 1px solid #ffe082; padding: 12px; border-radius: 4px; margin: 16px 0; }
`;

function wrap(
  title: string,
  bodyHtml: string,
  textBody: string,
  id: BuiltInTemplateId,
  name: string,
  subject: string,
  variables: string[]
): EmailTemplate {
  return {
    id,
    name,
    subject,
    variables,
    category: 'notification',
    isBuiltIn: true,
    htmlBody: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${baseStyles}</style></head>
<body><div class="container">
  <div class="header"><h1>{{establishmentName}}</h1><h2>${title}</h2></div>
  <div class="content">${bodyHtml}</div>
  <div class="footer"><p>Vous pouvez répondre à cet e-mail pour contacter l’établissement.</p></div>
</div></body></html>`,
    textBody,
  };
}

const commentBlockHtml = `<div class="commentaire"><strong>Commentaire de l’établissement :</strong><br>{{commentaire}}</div>`;

export class ReservationRequestedGuestTemplate {
  public static getTemplate(): EmailTemplate {
    return wrap(
      'Demande reçue',
      `<p>Bonjour {{customerName}},</p>
       <p>Nous avons bien reçu votre demande de réservation chez <strong>{{establishmentName}}</strong>.</p>
       <div class="detail">
         <p><strong>Date :</strong> {{startsAtFormatted}}</p>
         <p><strong>Nombre de personnes :</strong> {{partySize}}</p>
       </div>
       <p>L’établissement vous répondra bientôt par e-mail. Vous pouvez aussi répondre à ce message pour toute précision.</p>
       <div class="hint">
         <p>Si vous ne recevez pas de réponse de la part de l’établissement, n’hésitez pas à les relancer.</p>
         <p style="text-align:center;">
           <a href="{{relanceUrl}}" class="button">Relancer l’établissement</a>
         </p>
         <p style="font-size:12px;color:#666;">Ou ouvrez ce lien : {{relanceUrl}}</p>
       </div>`,
      `Bonjour {{customerName}},\n\nDemande reçue chez {{establishmentName}}.\nDate : {{startsAtFormatted}}\nPersonnes : {{partySize}}\n\nSi vous ne recevez pas de réponse, relancez l’établissement : {{relanceUrl}}`,
      BuiltInTemplateId.RESERVATION_REQUESTED_GUEST,
      'Reservation Requested Guest',
      'Demande de réservation reçue — {{establishmentName}}',
      ['customerName', 'establishmentName', 'startsAtFormatted', 'partySize', 'relanceUrl']
    );
  }
}

export class ReservationRequestedVenueTemplate {
  public static getTemplate(): EmailTemplate {
    return wrap(
      'Nouvelle demande',
      `<p>Nouvelle demande de réservation pour <strong>{{establishmentName}}</strong>.</p>
       <div class="detail">
         <p><strong>Client :</strong> {{customerName}}</p>
         <p><strong>Email :</strong> {{customerEmail}}</p>
         <p><strong>Téléphone :</strong> {{customerPhone}}</p>
         <p><strong>Date :</strong> {{startsAtFormatted}}</p>
         <p><strong>Personnes :</strong> {{partySize}}</p>
         <p><strong>Notes :</strong> {{notes}}</p>
       </div>
       <p>Traitez la demande dans Administration → Réservations ou Boîte mail.</p>`,
      `Nouvelle demande — {{establishmentName}}\nClient: {{customerName}}\nEmail: {{customerEmail}}\nTél: {{customerPhone}}\nDate: {{startsAtFormatted}}\nPersonnes: {{partySize}}\nNotes: {{notes}}`,
      BuiltInTemplateId.RESERVATION_REQUESTED_VENUE,
      'Reservation Requested Venue',
      'Nouvelle demande de réservation — {{customerName}} — {{startsAtFormatted}}',
      [
        'establishmentName',
        'customerName',
        'customerEmail',
        'customerPhone',
        'startsAtFormatted',
        'partySize',
        'notes',
      ]
    );
  }
}

export class ReservationReminderVenueTemplate {
  public static getTemplate(): EmailTemplate {
    return wrap(
      'Relance client',
      `<p><strong>Relance :</strong> le client n’a pas encore reçu de réponse pour sa demande chez <strong>{{establishmentName}}</strong>.</p>
       <div class="detail">
         <p><strong>Client :</strong> {{customerName}}</p>
         <p><strong>Email :</strong> {{customerEmail}}</p>
         <p><strong>Téléphone :</strong> {{customerPhone}}</p>
         <p><strong>Date :</strong> {{startsAtFormatted}}</p>
         <p><strong>Personnes :</strong> {{partySize}}</p>
         <p><strong>Notes :</strong> {{notes}}</p>
       </div>
       <p>Merci de traiter la demande (valider, mettre en attente ou refuser) dans Administration.</p>`,
      `RELANCE — {{establishmentName}}\nClient: {{customerName}}\nEmail: {{customerEmail}}\nTél: {{customerPhone}}\nDate: {{startsAtFormatted}}\nPersonnes: {{partySize}}\nNotes: {{notes}}`,
      BuiltInTemplateId.RESERVATION_REMINDER_VENUE,
      'Reservation Reminder Venue',
      'Relance — demande de réservation — {{customerName}} — {{startsAtFormatted}}',
      [
        'establishmentName',
        'customerName',
        'customerEmail',
        'customerPhone',
        'startsAtFormatted',
        'partySize',
        'notes',
      ]
    );
  }
}

export class ReservationConfirmedTemplate {
  public static getTemplate(): EmailTemplate {
    return wrap(
      'Réservation confirmée',
      `<p>Bonjour {{customerName}},</p>
       <p>Votre réservation chez <strong>{{establishmentName}}</strong> est <strong>confirmée</strong>.</p>
       <div class="detail">
         <p><strong>Date :</strong> {{startsAtFormatted}}</p>
         <p><strong>Nombre de personnes :</strong> {{partySize}}</p>
       </div>
       ${commentBlockHtml}
       <p>Si ces modalités ne vous conviennent pas, vous pouvez annuler jusqu’à 48&nbsp;h avant la date prévue :</p>
       <p style="text-align:center;">
         <a href="{{cancelUrl}}" class="button">Annuler ma réservation</a>
       </p>
       <p style="font-size:12px;color:#666;">Passé ce délai, une absence pourra être signalée comme no-show. Lien : {{cancelUrl}}</p>
       <p>À bientôt !</p>`,
      `Bonjour {{customerName}},\n\nRéservation confirmée chez {{establishmentName}}.\nDate : {{startsAtFormatted}}\nPersonnes : {{partySize}}\nCommentaire : {{commentaire}}\n\nAnnuler (jusqu’à 48 h avant) : {{cancelUrl}}`,
      BuiltInTemplateId.RESERVATION_CONFIRMED,
      'Reservation Confirmed',
      'Réservation confirmée — {{establishmentName}}',
      [
        'customerName',
        'establishmentName',
        'startsAtFormatted',
        'partySize',
        'commentaire',
        'cancelUrl',
      ]
    );
  }
}

export class ReservationRefusedTemplate {
  public static getTemplate(): EmailTemplate {
    return wrap(
      'Réservation refusée',
      `<p>Bonjour {{customerName}},</p>
       <p>Malheureusement, votre demande chez <strong>{{establishmentName}}</strong> ne peut pas être acceptée.</p>
       <div class="detail">
         <p><strong>Date demandée :</strong> {{startsAtFormatted}}</p>
         <p><strong>Nombre de personnes :</strong> {{partySize}}</p>
       </div>
       ${commentBlockHtml}
       <p>N’hésitez pas à proposer une autre date en répondant à cet e-mail.</p>`,
      `Bonjour {{customerName}},\n\nDemande refusée chez {{establishmentName}}.\nDate : {{startsAtFormatted}}\nCommentaire : {{commentaire}}\n\nRépondez à cet e-mail pour contacter l’établissement.`,
      BuiltInTemplateId.RESERVATION_REFUSED,
      'Reservation Refused',
      'Réservation refusée — {{establishmentName}}',
      ['customerName', 'establishmentName', 'startsAtFormatted', 'partySize', 'commentaire']
    );
  }
}

export class ReservationOnHoldTemplate {
  public static getTemplate(): EmailTemplate {
    return wrap(
      'Réservation en attente',
      `<p>Bonjour {{customerName}},</p>
       <p>Votre demande chez <strong>{{establishmentName}}</strong> est <strong>en attente</strong>.</p>
       <div class="detail">
         <p><strong>Date :</strong> {{startsAtFormatted}}</p>
         <p><strong>Nombre de personnes :</strong> {{partySize}}</p>
       </div>
       ${commentBlockHtml}
       <p>Répondez à cet e-mail pour nous indiquer vos préférences ; nous reviendrons vers vous rapidement.</p>
       <p>Vous pouvez aussi annuler jusqu’à 48&nbsp;h avant la date prévue :</p>
       <p style="text-align:center;">
         <a href="{{cancelUrl}}" class="button">Annuler ma réservation</a>
       </p>
       <p style="font-size:12px;color:#666;">Lien : {{cancelUrl}}</p>`,
      `Bonjour {{customerName}},\n\nDemande en attente chez {{establishmentName}}.\nDate : {{startsAtFormatted}}\nCommentaire : {{commentaire}}\n\nAnnuler (jusqu’à 48 h avant) : {{cancelUrl}}`,
      BuiltInTemplateId.RESERVATION_ON_HOLD,
      'Reservation On Hold',
      'Réservation en attente — {{establishmentName}}',
      [
        'customerName',
        'establishmentName',
        'startsAtFormatted',
        'partySize',
        'commentaire',
        'cancelUrl',
      ]
    );
  }
}

export class ReservationCancelledGuestTemplate {
  public static getTemplate(): EmailTemplate {
    return wrap(
      'Réservation annulée',
      `<p>Bonjour {{customerName}},</p>
       <p>Votre réservation chez <strong>{{establishmentName}}</strong> a bien été <strong>annulée</strong>.</p>
       <div class="detail">
         <p><strong>Date concernée :</strong> {{startsAtFormatted}}</p>
         <p><strong>Nombre de personnes :</strong> {{partySize}}</p>
       </div>
       <p>Vous pouvez à tout moment refaire une demande sur notre page de réservation.</p>`,
      `Bonjour {{customerName}},\n\nRéservation annulée chez {{establishmentName}}.\nDate : {{startsAtFormatted}}`,
      BuiltInTemplateId.RESERVATION_CANCELLED_GUEST,
      'Reservation Cancelled Guest',
      'Réservation annulée — {{establishmentName}}',
      ['customerName', 'establishmentName', 'startsAtFormatted', 'partySize']
    );
  }
}

export class ReservationCancelledVenueTemplate {
  public static getTemplate(): EmailTemplate {
    return wrap(
      'Annulation client',
      `<p>Le client a annulé sa réservation chez <strong>{{establishmentName}}</strong>.</p>
       <div class="detail">
         <p><strong>Client :</strong> {{customerName}}</p>
         <p><strong>Email :</strong> {{customerEmail}}</p>
         <p><strong>Téléphone :</strong> {{customerPhone}}</p>
         <p><strong>Date :</strong> {{startsAtFormatted}}</p>
         <p><strong>Personnes :</strong> {{partySize}}</p>
       </div>`,
      `Annulation client — {{establishmentName}}\n{{customerName}} / {{customerEmail}} / {{customerPhone}}\nDate : {{startsAtFormatted}}`,
      BuiltInTemplateId.RESERVATION_CANCELLED_VENUE,
      'Reservation Cancelled Venue',
      'Annulation client — {{customerName}} — {{startsAtFormatted}}',
      [
        'establishmentName',
        'customerName',
        'customerEmail',
        'customerPhone',
        'startsAtFormatted',
        'partySize',
      ]
    );
  }
}
