/**
 * Platform-wide guest no-show flags (email / phone).
 */

import { pool } from '../db/pool';

export interface GuestReliabilityInfo {
  flagged: boolean;
  flag_count: number;
  first_flagged_at: string | null;
  last_flagged_at: string | null;
  matched_on: Array<'email' | 'phone'>;
}

export function normalizeGuestEmail(email: string | null | undefined): string | null {
  const v = String(email || '')
    .trim()
    .toLowerCase();
  if (!v || !v.includes('@')) return null;
  return v;
}

/** Digits only; keep last 10 for matching FR mobiles (0XXXXXXXXX → 9–10 digits). */
export function normalizeGuestPhone(phone: string | null | undefined): string | null {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  // FR: 0033 / +33 / 0…
  let n = digits;
  if (n.startsWith('33') && n.length >= 11) n = `0${n.slice(2)}`;
  if (n.startsWith('0033')) n = `0${n.slice(4)}`;
  return n.slice(-10);
}

export class GuestNoShowFlagModel {
  static async flagContacts(input: {
    email?: string | null;
    phone?: string | null;
    source_establishment_id: string;
    source_reservation_id?: number | null;
  }): Promise<void> {
    const email = normalizeGuestEmail(input.email);
    const phone = normalizeGuestPhone(input.phone);
    if (!email && !phone) return;

    const upsert = async (contactType: 'email' | 'phone', contactValue: string) => {
      await pool.query(
        `INSERT INTO guest_no_show_flags (
           contact_type, contact_value, source_establishment_id, source_reservation_id,
           flag_count, first_flagged_at, last_flagged_at
         ) VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (contact_type, contact_value) DO UPDATE SET
           flag_count = guest_no_show_flags.flag_count + 1,
           last_flagged_at = CURRENT_TIMESTAMP,
           source_establishment_id = EXCLUDED.source_establishment_id,
           source_reservation_id = EXCLUDED.source_reservation_id`,
        [
          contactType,
          contactValue,
          input.source_establishment_id,
          input.source_reservation_id ?? null,
        ]
      );
    };

    if (email) await upsert('email', email);
    if (phone) await upsert('phone', phone);
  }

  static async lookup(
    email?: string | null,
    phone?: string | null
  ): Promise<GuestReliabilityInfo> {
    const emailN = normalizeGuestEmail(email);
    const phoneN = normalizeGuestPhone(phone);
    if (!emailN && !phoneN) {
      return {
        flagged: false,
        flag_count: 0,
        first_flagged_at: null,
        last_flagged_at: null,
        matched_on: [],
      };
    }

    const conditions: string[] = [];
    const values: unknown[] = [];
    if (emailN) {
      values.push('email', emailN);
      conditions.push(
        `(contact_type = $${values.length - 1} AND contact_value = $${values.length})`
      );
    }
    if (phoneN) {
      values.push('phone', phoneN);
      conditions.push(
        `(contact_type = $${values.length - 1} AND contact_value = $${values.length})`
      );
    }

    const result = await pool.query(
      `SELECT contact_type, flag_count, first_flagged_at, last_flagged_at
       FROM guest_no_show_flags
       WHERE ${conditions.join(' OR ')}`,
      values
    );

    if (result.rows.length === 0) {
      return {
        flagged: false,
        flag_count: 0,
        first_flagged_at: null,
        last_flagged_at: null,
        matched_on: [],
      };
    }

    let flagCount = 0;
    let first: string | null = null;
    let last: string | null = null;
    const matched_on: Array<'email' | 'phone'> = [];
    for (const row of result.rows) {
      matched_on.push(row.contact_type as 'email' | 'phone');
      flagCount = Math.max(flagCount, Number(row.flag_count) || 0);
      const f = row.first_flagged_at ? new Date(row.first_flagged_at).toISOString() : null;
      const l = row.last_flagged_at ? new Date(row.last_flagged_at).toISOString() : null;
      if (f && (!first || f < first)) first = f;
      if (l && (!last || l > last)) last = l;
    }

    return {
      flagged: true,
      flag_count: flagCount,
      first_flagged_at: first,
      last_flagged_at: last,
      matched_on,
    };
  }

  static async lookupMany(
    contacts: Array<{ email?: string | null; phone?: string | null; key: string }>
  ): Promise<Map<string, GuestReliabilityInfo>> {
    const map = new Map<string, GuestReliabilityInfo>();
    await Promise.all(
      contacts.map(async (c) => {
        map.set(c.key, await this.lookup(c.email, c.phone));
      })
    );
    return map;
  }
}
