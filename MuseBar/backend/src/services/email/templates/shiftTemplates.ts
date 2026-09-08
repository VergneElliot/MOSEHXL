import { EmailTemplate, BuiltInTemplateId } from './types';

export class ShiftConfirmationEmployeeTemplate {
  static getTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.SHIFT_CONFIRMATION_EMPLOYEE,
      name: 'Confirmation vacation employé',
      subject: 'Modifications de planning — {{establishmentName}}',
      category: 'notification',
      isBuiltIn: true,
      htmlBody: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#222">
          <h2>Modifications de planning</h2>
          <p>Bonjour {{employeeName}},</p>
          <p>
            <strong>{{establishmentName}}</strong> a enregistré
            {{changeCountLabel}} vous concernant :
          </p>
          {{changesHtml}}
          <p>
            Ouvrez la page ci-dessous pour confirmer ou refuser tout ou partie
            de ces modifications (un motif est demandé en cas de refus).
          </p>
          <p style="margin:24px 0">
            <a href="{{pageUrl}}"
               style="background:#1565c0;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;display:inline-block">
              Voir et répondre
            </a>
          </p>
          <p style="color:#666;font-size:13px">
            Si le bouton ne fonctionne pas, ouvrez :<br/>{{pageUrl}}
          </p>
        </div>
      `,
      textBody: `
Modifications de planning — {{establishmentName}}

Bonjour {{employeeName}},

{{establishmentName}} a enregistré {{changeCountLabel}} vous concernant :

{{changesText}}

Voir et répondre : {{pageUrl}}
      `.trim(),
      variables: [
        'establishmentName',
        'employeeName',
        'changeCountLabel',
        'changesHtml',
        'changesText',
        'pageUrl',
      ],
    };
  }
}
