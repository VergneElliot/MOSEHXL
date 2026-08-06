import { EmailTemplate, BuiltInTemplateId } from './types';

const RECURRENCE_FR: Record<string, string> = {
  once: 'Une seule fois',
  daily: 'Tous les jours',
  weekly: 'Toutes les semaines',
  monthly: 'Tous les mois',
  yearly: 'Tous les ans',
};

export class ShiftConfirmationEmployeeTemplate {
  static getTemplate(): EmailTemplate {
    return {
      id: BuiltInTemplateId.SHIFT_CONFIRMATION_EMPLOYEE,
      name: 'Confirmation vacation employé',
      subject: 'Confirmez votre planning — {{establishmentName}}',
      category: 'notification',
      isBuiltIn: true,
      htmlBody: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#222">
          <h2>Confirmation de planning</h2>
          <p>Bonjour {{employeeName}},</p>
          <p>
            <strong>{{establishmentName}}</strong> vous a proposé
            {{shiftCountLabel}} sur le planning.
          </p>
          <ul>
            <li><strong>Fréquence :</strong> {{recurrenceLabel}}</li>
            <li><strong>Première vacation :</strong> {{firstShiftLabel}}</li>
            <li><strong>Libellé :</strong> {{label}}</li>
          </ul>
          <p>
            Merci de confirmer (ou refuser) cette proposition.
            Pour une fréquence récurrente, une seule confirmation suffit :
            les occurrences suivantes seront alors planifiées automatiquement.
          </p>
          <p style="margin:24px 0">
            <a href="{{confirmUrl}}"
               style="background:#2e7d32;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;display:inline-block;margin-right:8px">
              Confirmer le planning
            </a>
            <a href="{{declineUrl}}"
               style="background:#c62828;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;display:inline-block">
              Refuser
            </a>
          </p>
          <p style="color:#666;font-size:13px">
            Si les boutons ne fonctionnent pas, ouvrez :<br/>{{confirmUrl}}
          </p>
        </div>
      `,
      textBody: `
Confirmation de planning — {{establishmentName}}

Bonjour {{employeeName}},

{{establishmentName}} vous a proposé {{shiftCountLabel}}.
Fréquence : {{recurrenceLabel}}
Première vacation : {{firstShiftLabel}}
Libellé : {{label}}

Confirmer : {{confirmUrl}}
Refuser : {{declineUrl}}
      `.trim(),
      variables: [
        'establishmentName',
        'employeeName',
        'shiftCountLabel',
        'recurrenceLabel',
        'firstShiftLabel',
        'label',
        'confirmUrl',
        'declineUrl',
      ],
    };
  }

  static recurrenceLabel(recurrence: string): string {
    return RECURRENCE_FR[recurrence] || recurrence;
  }
}
