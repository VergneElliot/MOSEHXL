/**
 * Per-employee planning confirmation batches (one token / email per save).
 */

import { pool } from '../db/pool';
import type { PoolClient } from 'pg';

export type ShiftChangeType = 'create' | 'update' | 'delete';
export type ShiftChangeDecision = 'pending' | 'confirmed' | 'declined';

export interface StaffShiftConfirmationBatch {
  id: string;
  establishment_id: string;
  user_id: number;
  token: string;
  created_at: string;
  closed_at: string | null;
}

export interface StaffShiftConfirmationItem {
  id: string;
  batch_id: string;
  shift_id: number | null;
  change_type: ShiftChangeType;
  starts_at: string | null;
  ends_at: string | null;
  label: string | null;
  previous_starts_at: string | null;
  previous_ends_at: string | null;
  previous_label: string | null;
  decision: ShiftChangeDecision;
  decline_reason: string | null;
  created_at: string;
}

async function withRlsBypass<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.bypass_rls', 'on', true)");
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export class StaffShiftConfirmationModel {
  static async createBatch(
    establishmentId: string,
    userId: number,
    client?: PoolClient
  ): Promise<StaffShiftConfirmationBatch> {
    const q = client ?? pool;
    const result = await q.query(
      `INSERT INTO staff_shift_confirmation_batches (establishment_id, user_id)
       VALUES ($1, $2)
       RETURNING *`,
      [establishmentId, userId]
    );
    return result.rows[0] as StaffShiftConfirmationBatch;
  }

  static async addItem(
    input: {
      batch_id: string;
      shift_id?: number | null;
      change_type: ShiftChangeType;
      starts_at?: string | null;
      ends_at?: string | null;
      label?: string | null;
      previous_starts_at?: string | null;
      previous_ends_at?: string | null;
      previous_label?: string | null;
      decision?: ShiftChangeDecision;
    },
    client?: PoolClient
  ): Promise<StaffShiftConfirmationItem> {
    const q = client ?? pool;
    const result = await q.query(
      `INSERT INTO staff_shift_confirmation_items (
         batch_id, shift_id, change_type,
         starts_at, ends_at, label,
         previous_starts_at, previous_ends_at, previous_label,
         decision
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        input.batch_id,
        input.shift_id ?? null,
        input.change_type,
        input.starts_at ?? null,
        input.ends_at ?? null,
        input.label ?? null,
        input.previous_starts_at ?? null,
        input.previous_ends_at ?? null,
        input.previous_label ?? null,
        input.decision ?? (input.change_type === 'delete' ? 'confirmed' : 'pending'),
      ]
    );
    return result.rows[0] as StaffShiftConfirmationItem;
  }

  static async findByToken(token: string): Promise<{
    batch: StaffShiftConfirmationBatch;
    items: StaffShiftConfirmationItem[];
  } | null> {
    return withRlsBypass(async (client) => {
      const batchRes = await client.query(
        `SELECT * FROM staff_shift_confirmation_batches WHERE token = $1::uuid`,
        [token]
      );
      const batch = batchRes.rows[0] as StaffShiftConfirmationBatch | undefined;
      if (!batch) return null;
      const itemsRes = await client.query(
        `SELECT * FROM staff_shift_confirmation_items
         WHERE batch_id = $1
         ORDER BY starts_at ASC NULLS LAST, created_at ASC`,
        [batch.id]
      );
      return { batch, items: itemsRes.rows as StaffShiftConfirmationItem[] };
    });
  }

  static async closeBatchIfDone(batchId: string, client?: PoolClient): Promise<void> {
    const q = client ?? pool;
    const pending = await q.query(
      `SELECT 1 FROM staff_shift_confirmation_items
       WHERE batch_id = $1 AND decision = 'pending' AND change_type <> 'delete'
       LIMIT 1`,
      [batchId]
    );
    if (pending.rows.length === 0) {
      await q.query(
        `UPDATE staff_shift_confirmation_batches
         SET closed_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND closed_at IS NULL`,
        [batchId]
      );
    }
  }

  static async setItemDecision(
    itemId: string,
    decision: 'confirmed' | 'declined',
    declineReason: string | null,
    client?: PoolClient
  ): Promise<StaffShiftConfirmationItem | null> {
    const q = client ?? pool;
    const result = await q.query(
      `UPDATE staff_shift_confirmation_items
       SET decision = $2,
           decline_reason = $3
       WHERE id = $1::uuid
         AND decision = 'pending'
         AND change_type <> 'delete'
       RETURNING *`,
      [itemId, decision, declineReason]
    );
    return (result.rows[0] as StaffShiftConfirmationItem) ?? null;
  }

  static async setItemDecisionWithBypass(
    itemId: string,
    decision: 'confirmed' | 'declined',
    declineReason: string | null
  ): Promise<StaffShiftConfirmationItem | null> {
    return withRlsBypass(async (client) =>
      this.setItemDecision(itemId, decision, declineReason, client)
    );
  }

  static async closeBatchIfDoneWithBypass(batchId: string): Promise<void> {
    return withRlsBypass(async (client) => this.closeBatchIfDone(batchId, client));
  }
}
