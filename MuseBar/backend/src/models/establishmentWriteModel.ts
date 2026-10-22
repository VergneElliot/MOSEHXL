import { pool } from '../db/pool';
import { randomUUID } from 'crypto';
import { logSoftwareEventBestEffort } from '../services/legal/softwareEventJournal';
import { establishmentLogger } from './establishmentLog';
import type {
  CreateEstablishmentData,
  Establishment,
  UpdateEstablishmentData,
} from './establishmentTypes';

export async function createEstablishment(data: CreateEstablishmentData): Promise<Establishment> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Legacy metadata: keep a unique schema_name value but do not create per-tenant schemas.
    const schemaName = `establishment_${randomUUID().replace(/-/g, '_')}`;

    const establishmentQuery = `
        INSERT INTO establishments (
          id, name, email, phone, address, schema_name, 
          subscription_plan, subscription_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

    const establishmentValues = [
      randomUUID(),
      data.name,
      data.email,
      data.phone || null,
      data.address || null,
      schemaName,
      data.subscription_plan || 'basic',
      'active'
    ];

    const establishmentResult = await client.query(establishmentQuery, establishmentValues);
    const establishment = establishmentResult.rows[0];

    await client.query('COMMIT');

    establishmentLogger()?.info(
      'Establishment created successfully',
      {
        establishmentId: establishment.id,
        establishmentName: establishment.name,
        schemaName: establishment.schema_name,
        email: establishment.email
      },
      'ESTABLISHMENT_MODEL'
    );

    return establishment;

  } catch (error) {
    await client.query('ROLLBACK');

    establishmentLogger()?.error(
      'Failed to create establishment',
      {
        error: error as Error,
        establishmentData: data
      },
      'ESTABLISHMENT_MODEL'
    );

    throw error;
  } finally {
    client.release();
  }
}

export async function updateEstablishment(
  id: string,
  data: UpdateEstablishmentData
): Promise<Establishment> {
  try {
    const fields: string[] = [];
    const values: Array<string | number | boolean | null> = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }
    if (data.address !== undefined) {
      fields.push(`address = $${paramIndex++}`);
      values.push(data.address);
    }
    if (data.subscription_plan !== undefined) {
      fields.push(`subscription_plan = $${paramIndex++}`);
      values.push(data.subscription_plan);
    }
    if (data.subscription_status !== undefined) {
      fields.push(`subscription_status = $${paramIndex++}`);
      values.push(data.subscription_status);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
        UPDATE establishments 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Establishment not found');
    }

    establishmentLogger()?.info(
      'Establishment updated successfully',
      { establishmentId: id, updatedFields: Object.keys(data) },
      'ESTABLISHMENT_MODEL'
    );

    if (data.subscription_plan !== undefined || data.subscription_status !== undefined) {
      await logSoftwareEventBestEffort({
        establishmentId: id,
        eventType: 'ESTABLISHMENT_SUBSCRIPTION_UPDATED',
        eventData: {
          update_type: 'subscription_change',
          subscription_plan: data.subscription_plan,
          subscription_status: data.subscription_status,
        },
      });
    }

    return result.rows[0];
  } catch (error) {
    establishmentLogger()?.error(
      'Failed to update establishment',
      {
        error: error as Error,
        establishmentId: id,
        updateData: data
      },
      'ESTABLISHMENT_MODEL'
    );
    throw error;
  }
}
