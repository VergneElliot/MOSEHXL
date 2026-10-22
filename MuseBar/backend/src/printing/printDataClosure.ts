import type { Pool } from 'pg';
import { getRegisterIdForEstablishment } from '../utils/registerId';
import type { ClosureBulletinData as PrintingClosureBulletinData } from '../services/printing/types';
import type { PrintingUser } from './printDataTypes';

export async function buildClosureBulletinData(
  pool: Pool,
  user: PrintingUser,
  bulletinId: number
): Promise<PrintingClosureBulletinData> {
  const bulletinResult = await pool.query(
    `SELECT 
      cb.*,
      COALESCE(bs.name, e.name) as business_name,
      COALESCE(bs.address, e.address) as business_address,
      COALESCE(bs.phone, e.phone) as business_phone,
      COALESCE(bs.email, e.email) as business_email,
      bs.siret,
      bs.tax_identification
    FROM closure_bulletins cb
    JOIN establishments e ON cb.establishment_id = e.id
    LEFT JOIN LATERAL (
      SELECT name, address, phone, email, siret, tax_identification
      FROM business_settings
      WHERE establishment_id = e.id
      ORDER BY updated_at DESC
      LIMIT 1
    ) bs ON true
    WHERE cb.id = $1 AND cb.establishment_id = $2`,
    [bulletinId, user.establishment_id]
  );

  if (bulletinResult.rows.length === 0) {
    const err = Object.assign(new Error('Closure bulletin not found'), { statusCode: 404 });
    throw err;
  }

  const bulletin = bulletinResult.rows[0];
  const bulletinData: PrintingClosureBulletinData = {
    id: Number(bulletin.id),
    closure_type: bulletin.closure_type,
    period_start: new Date(bulletin.period_start).toISOString(),
    period_end: new Date(bulletin.period_end).toISOString(),
    total_transactions: Number(bulletin.total_transactions),
    fond_de_caisse: bulletin.fond_de_caisse ? parseFloat(bulletin.fond_de_caisse) : 0,
    total_amount: parseFloat(bulletin.total_amount),
    total_vat: parseFloat(bulletin.total_vat),
    vat_breakdown: bulletin.vat_breakdown,
    payment_methods_breakdown: bulletin.payment_methods_breakdown,
    first_sequence: Number(bulletin.first_sequence),
    last_sequence: Number(bulletin.last_sequence),
    closure_hash: String(bulletin.closure_hash),
    is_closed: Boolean(bulletin.is_closed),
    closed_at: bulletin.closed_at,
    created_at: bulletin.created_at,
    tips_total: bulletin.tips_total ? parseFloat(bulletin.tips_total) : undefined,
    change_total: bulletin.change_total ? parseFloat(bulletin.change_total) : undefined,
    business_info: {
      name: String(bulletin.business_name ?? ''),
      address: String(bulletin.business_address ?? ''),
      phone: String(bulletin.business_phone ?? ''),
      email: String(bulletin.business_email ?? ''),
      siret: bulletin.siret ? String(bulletin.siret) : undefined,
      tax_identification: bulletin.tax_identification ? String(bulletin.tax_identification) : undefined,
    },
    compliance_info: {
      cash_register_id: getRegisterIdForEstablishment(user.establishment_id),
      operator_id: user.username,
    },
  };

  return bulletinData;
}
