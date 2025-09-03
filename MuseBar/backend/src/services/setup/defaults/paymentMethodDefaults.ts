import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';

const logger = Logger.getInstance();

export async function createDefaultPaymentMethods(
  client: PoolClient,
  establishmentId: string
): Promise<void> {
  const paymentMethods = [
    { name: 'Espèces', code: 'cash', is_active: true, requires_amount: true, description: 'Paiement en liquide' },
    { name: 'Carte Bancaire', code: 'card', is_active: true, requires_amount: false, description: 'Paiement par carte bancaire' },
    { name: 'Chèque', code: 'check', is_active: false, requires_amount: true, description: 'Paiement par chèque' }
  ];

  logger.info('Creating default payment methods', { establishmentId, count: paymentMethods.length }, 'SETUP_DEFAULTS');

  for (const method of paymentMethods) {
    await client.query(
      `
      INSERT INTO payment_methods (
        establishment_id, name, code, is_active, requires_amount, description,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
      [
        establishmentId,
        method.name,
        method.code,
        method.is_active,
        method.requires_amount,
        method.description
      ]
    );
  }

  logger.info('Default payment methods created successfully', { establishmentId, methodsCreated: paymentMethods.length }, 'SETUP_DEFAULTS');
}


