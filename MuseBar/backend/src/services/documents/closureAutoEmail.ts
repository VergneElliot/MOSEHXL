/**
 * Best-effort auto-email of a closure bulletin to configured accounting addresses.
 * Never throws — fiscal create must not fail because of SendGrid.
 */

import type { Pool } from 'pg';
import { pool as defaultPool } from '../../db/pool';
import { ClosureSettingsModel } from '../../models/closureSettings';
import { buildClosureBulletinData, type PrintingUser } from '../../printing/printDataRepo';
import { emailClosureBulletinDocument } from './documentEmailService';
import { Logger } from '../../utils/logger';

export async function maybeAutoEmailClosureBulletin(params: {
  establishmentId: string;
  bulletinId: number;
  pool?: Pool;
  operatorId?: string;
  /** One-off recipients from the create/print dialog (not persisted to settings). */
  extraRecipients?: string[];
}): Promise<void> {
  const { establishmentId, bulletinId } = params;
  const db = params.pool ?? defaultPool;

  try {
    if (!Number.isFinite(bulletinId) || bulletinId <= 0) return;

    const settings = await ClosureSettingsModel.getClosureSettings(establishmentId);
    const seen = new Set<string>();
    const recipients: string[] = [];
    for (const raw of [...(settings.accounting_emails ?? []), ...(params.extraRecipients ?? [])]) {
      const email = String(raw ?? '').trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      recipients.push(email);
    }
    if (recipients.length === 0) return;

    const user: PrintingUser = {
      establishment_id: establishmentId,
      id: 0,
      username: params.operatorId ?? 'system',
    };

    const bulletinData = await buildClosureBulletinData(db, user, bulletinId);
    const result = await emailClosureBulletinDocument(db, establishmentId, bulletinData, recipients);

    Logger.getInstance().info(
      'Closure bulletin auto-emailed to accounting addresses',
      {
        establishmentId,
        bulletinId,
        recipients,
        trackingId: result.trackingId,
      },
      'CLOSURE_AUTO_EMAIL'
    );
  } catch (error) {
    Logger.getInstance().error(
      'Failed to auto-email closure bulletin (non-blocking)',
      error instanceof Error ? error : new Error(String(error)),
      'CLOSURE_AUTO_EMAIL'
    );
  }
}
