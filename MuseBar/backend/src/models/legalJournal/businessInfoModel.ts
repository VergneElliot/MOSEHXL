import { pool } from '../../db/pool';

export interface BusinessInfoRow {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  tax_identification: string;
}

export class BusinessInfoModel {
  static async getBusinessInfo(establishmentId: string): Promise<BusinessInfoRow> {
    const result = await pool.query(
      `SELECT name, address, phone, email, siret, tax_identification
       FROM business_settings
       WHERE establishment_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [establishmentId]
    );

    if (result.rows.length === 0) {
      return {
        name: '',
        address: '',
        phone: '',
        email: '',
        siret: '',
        tax_identification: '',
      };
    }

    return result.rows[0] as BusinessInfoRow;
  }

  static async upsertBusinessInfo(
    establishmentId: string,
    data: Partial<BusinessInfoRow>
  ): Promise<BusinessInfoRow> {
    const { name, address, phone, email, siret, tax_identification } = data;

    const result = await pool.query(
      `INSERT INTO business_settings (
         establishment_id, name, address, phone, email, siret, tax_identification, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (establishment_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         address = EXCLUDED.address,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         siret = EXCLUDED.siret,
         tax_identification = EXCLUDED.tax_identification,
         updated_at = CURRENT_TIMESTAMP
       RETURNING name, address, phone, email, siret, tax_identification`,
      [establishmentId, name, address, phone, email, siret, tax_identification]
    );

    return result.rows[0] as BusinessInfoRow;
  }
}

