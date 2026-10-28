import { pool } from '../db/pool';
import type { PinSessionReportSnapshot } from '../services/pinSessions/pinSessionReportAggregate';

export type PinSessionReportRow = {
  id: string;
  establishment_id: string;
  pin_session_id: string;
  generated_at: Date;
  generated_by_account_user_id: number | null;
  generated_by_pin_user_id: number | null;
  snapshot: PinSessionReportSnapshot;
};

export class PinSessionReportModel {
  static async insert(input: {
    establishmentId: string;
    pinSessionId: string;
    accountUserId: number | null;
    pinUserId: number | null;
    snapshot: PinSessionReportSnapshot;
  }): Promise<PinSessionReportRow> {
    const result = await pool.query(
      `INSERT INTO pin_session_reports
         (establishment_id, pin_session_id, generated_by_account_user_id, generated_by_pin_user_id, snapshot)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [
        input.establishmentId,
        input.pinSessionId,
        input.accountUserId,
        input.pinUserId,
        JSON.stringify(input.snapshot),
      ]
    );
    return mapRow(result.rows[0]);
  }

  static async listForSession(
    establishmentId: string,
    pinSessionId: string
  ): Promise<PinSessionReportRow[]> {
    const result = await pool.query(
      `SELECT * FROM pin_session_reports
       WHERE establishment_id = $1 AND pin_session_id = $2
       ORDER BY generated_at DESC`,
      [establishmentId, pinSessionId]
    );
    return result.rows.map(mapRow);
  }

  static async findById(
    establishmentId: string,
    reportId: string
  ): Promise<PinSessionReportRow | null> {
    const result = await pool.query(
      `SELECT * FROM pin_session_reports
       WHERE id = $1 AND establishment_id = $2`,
      [reportId, establishmentId]
    );
    const row = result.rows[0];
    return row ? mapRow(row) : null;
  }
}

function mapRow(row: Record<string, unknown>): PinSessionReportRow {
  const snapshot =
    typeof row.snapshot === 'string'
      ? (JSON.parse(row.snapshot) as PinSessionReportSnapshot)
      : (row.snapshot as PinSessionReportSnapshot);
  return {
    id: String(row.id),
    establishment_id: String(row.establishment_id),
    pin_session_id: String(row.pin_session_id),
    generated_at: row.generated_at as Date,
    generated_by_account_user_id:
      row.generated_by_account_user_id == null ? null : Number(row.generated_by_account_user_id),
    generated_by_pin_user_id:
      row.generated_by_pin_user_id == null ? null : Number(row.generated_by_pin_user_id),
    snapshot,
  };
}
