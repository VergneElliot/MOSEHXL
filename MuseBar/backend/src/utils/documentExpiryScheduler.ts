/**
 * Daily document expiry reminders (30 / 7 / 1 days before expires_at).
 */

import { pool } from '../db/pool';
import { runWithTenantContext } from '../rls/tenantContext';
import { Logger } from './logger';
import { getEnvironmentConfig } from '../config/environment';
import { EmailService } from '../services/email/EmailService';

const REMINDER_DAYS = [30, 7, 1] as const;

export class DocumentExpiryScheduler {
  private static interval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    void this.runOnce();
    this.interval = setInterval(() => {
      void this.runOnce();
    }, 60 * 60 * 1000);
  }

  static stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.isRunning = false;
  }

  static async runOnce() {
    try {
      const establishments = await pool.query(`SELECT id, name, email FROM establishments`);
      for (const est of establishments.rows as Array<{ id: string; name: string; email: string }>) {
        await runWithTenantContext({ establishmentId: est.id }, async () => {
          for (const days of REMINDER_DAYS) {
            const docs = await pool.query(
              `SELECT d.id, d.title, d.expires_at, d.category
               FROM admin_documents d
               WHERE d.establishment_id = $1
                 AND d.deleted_at IS NULL
                 AND d.expires_at IS NOT NULL
                 AND d.expires_at = (CURRENT_DATE + ($2::int || ' days')::interval)::date
                 AND NOT EXISTS (
                   SELECT 1 FROM admin_document_expiry_reminders r
                   WHERE r.document_id = d.id AND r.days_before = $2
                 )`,
              [est.id, days]
            );

            if (docs.rows.length === 0 || !est.email) continue;

            const lines = docs.rows
              .map(
                (d: { title: string; expires_at: string; category: string }) =>
                  `• ${d.title} (${d.category}) — expire le ${d.expires_at}`
              )
              .join('\n');

            try {
              const emailService = EmailService.getInstance(
                getEnvironmentConfig(),
                Logger.getInstance()
              );
              await emailService.sendEmail({
                to: est.email,
                subject: `[${est.name}] Documents expirant dans ${days} jour${days > 1 ? 's' : ''}`,
                text: `Les documents suivants expirent bientôt :\n\n${lines}\n\nConnectez-vous à l'espace Administration pour les renouveler.`,
                html: `<p>Les documents suivants expirent dans <strong>${days}</strong> jour${days > 1 ? 's' : ''} :</p>
                       <pre style="font-family:sans-serif">${lines}</pre>
                       <p>Connectez-vous à l'espace Administration pour les renouveler.</p>`,
              });

              for (const d of docs.rows as Array<{ id: number }>) {
                await pool.query(
                  `INSERT INTO admin_document_expiry_reminders (establishment_id, document_id, days_before)
                   VALUES ($1, $2, $3)
                   ON CONFLICT (document_id, days_before) DO NOTHING`,
                  [est.id, d.id, days]
                );
              }
            } catch (error) {
              Logger.getInstance().error(
                'Document expiry reminder failed',
                error instanceof Error ? error : new Error(String(error)),
                'DOCUMENT_EXPIRY'
              );
            }
          }
        });
      }
    } catch (error) {
      Logger.getInstance().error(
        'DocumentExpiryScheduler run failed',
        error instanceof Error ? error : new Error(String(error)),
        'DOCUMENT_EXPIRY'
      );
    }
  }
}
