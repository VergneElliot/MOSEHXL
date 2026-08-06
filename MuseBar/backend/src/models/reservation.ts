import { pool } from '../db/pool';

export type ReservationStatus =
  | 'requested'
  | 'on_hold'
  | 'confirmed'
  | 'refused'
  | 'cancelled'
  | 'no_show'
  | 'seated';

export interface Reservation {
  id: number;
  establishment_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  party_size: number;
  starts_at: string;
  ends_at: string | null;
  status: ReservationStatus;
  status_reason: string | null;
  notes: string | null;
  source: string;
  inbox_message_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

const STATUSES: ReservationStatus[] = [
  'requested',
  'on_hold',
  'confirmed',
  'refused',
  'cancelled',
  'no_show',
  'seated',
];

export class ReservationModel {
  static isValidStatus(value: string): value is ReservationStatus {
    return STATUSES.includes(value as ReservationStatus);
  }

  static requiresReason(status: ReservationStatus): boolean {
    return status === 'on_hold' || status === 'refused' || status === 'confirmed';
  }

  static async list(
    establishmentId: string,
    opts: { from?: string; to?: string; status?: string } = {}
  ): Promise<Reservation[]> {
    const conditions = ['establishment_id = $1'];
    const values: unknown[] = [establishmentId];
    if (opts.from) {
      values.push(opts.from);
      conditions.push(`starts_at >= $${values.length}::timestamptz`);
    }
    if (opts.to) {
      values.push(opts.to);
      conditions.push(`starts_at < $${values.length}::timestamptz`);
    }
    if (opts.status && this.isValidStatus(opts.status)) {
      values.push(opts.status);
      conditions.push(`status = $${values.length}`);
    }
    const result = await pool.query(
      `SELECT * FROM reservations WHERE ${conditions.join(' AND ')} ORDER BY starts_at ASC`,
      values
    );
    return result.rows as Reservation[];
  }

  static async getById(establishmentId: string, id: number): Promise<Reservation | null> {
    const result = await pool.query(
      `SELECT * FROM reservations WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, id]
    );
    return (result.rows[0] as Reservation) ?? null;
  }

  static async findByInboxMessageId(
    establishmentId: string,
    inboxMessageId: number
  ): Promise<Reservation | null> {
    const result = await pool.query(
      `SELECT * FROM reservations
       WHERE establishment_id = $1 AND inbox_message_id = $2
       ORDER BY id DESC LIMIT 1`,
      [establishmentId, inboxMessageId]
    );
    return (result.rows[0] as Reservation) ?? null;
  }

  static async findLatestOpenByEmail(
    establishmentId: string,
    email: string
  ): Promise<Reservation | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;
    // Any status: inbox needs Valider / En attente / Refuser for follow-ups
    // even after refuse, cancel, seated, no-show, etc.
    const result = await pool.query(
      `SELECT * FROM reservations
       WHERE establishment_id = $1
         AND LOWER(customer_email) = $2
       ORDER BY updated_at DESC, id DESC
       LIMIT 1`,
      [establishmentId, normalized]
    );
    return (result.rows[0] as Reservation) ?? null;
  }

  static async create(input: {
    establishment_id: string;
    customer_name: string;
    customer_email?: string | null;
    customer_phone?: string | null;
    party_size: number;
    starts_at: string;
    ends_at?: string | null;
    status?: ReservationStatus;
    status_reason?: string | null;
    notes?: string | null;
    source?: string;
    inbox_message_id?: number | null;
    created_by?: number | null;
  }): Promise<Reservation> {
    const result = await pool.query(
      `INSERT INTO reservations (
         establishment_id, customer_name, customer_email, customer_phone, party_size,
         starts_at, ends_at, status, status_reason, notes, source, inbox_message_id, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        input.establishment_id,
        input.customer_name,
        input.customer_email ?? null,
        input.customer_phone ?? null,
        input.party_size,
        input.starts_at,
        input.ends_at ?? null,
        input.status ?? 'requested',
        input.status_reason ?? null,
        input.notes ?? null,
        input.source ?? 'manual',
        input.inbox_message_id ?? null,
        input.created_by ?? null,
      ]
    );
    return result.rows[0] as Reservation;
  }

  static async update(
    establishmentId: string,
    id: number,
    patch: Partial<{
      customer_name: string;
      customer_email: string | null;
      customer_phone: string | null;
      party_size: number;
      starts_at: string;
      ends_at: string | null;
      status: ReservationStatus;
      status_reason: string | null;
      notes: string | null;
      inbox_message_id: number | null;
    }>
  ): Promise<Reservation | null> {
    const existing = await this.getById(establishmentId, id);
    if (!existing) return null;
    const result = await pool.query(
      `UPDATE reservations SET
         customer_name = $3,
         customer_email = $4,
         customer_phone = $5,
         party_size = $6,
         starts_at = $7,
         ends_at = $8,
         status = $9,
         status_reason = $10,
         notes = $11,
         inbox_message_id = $12,
         updated_at = CURRENT_TIMESTAMP
       WHERE establishment_id = $1 AND id = $2
       RETURNING *`,
      [
        establishmentId,
        id,
        patch.customer_name ?? existing.customer_name,
        patch.customer_email !== undefined ? patch.customer_email : existing.customer_email,
        patch.customer_phone !== undefined ? patch.customer_phone : existing.customer_phone,
        patch.party_size ?? existing.party_size,
        patch.starts_at ?? existing.starts_at,
        patch.ends_at !== undefined ? patch.ends_at : existing.ends_at,
        patch.status ?? existing.status,
        patch.status_reason !== undefined ? patch.status_reason : existing.status_reason,
        patch.notes !== undefined ? patch.notes : existing.notes,
        patch.inbox_message_id !== undefined
          ? patch.inbox_message_id
          : existing.inbox_message_id,
      ]
    );
    return (result.rows[0] as Reservation) ?? null;
  }

  static async delete(establishmentId: string, id: number): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM reservations WHERE establishment_id = $1 AND id = $2`,
      [establishmentId, id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
