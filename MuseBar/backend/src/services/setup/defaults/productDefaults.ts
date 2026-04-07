import { PoolClient } from 'pg';
import { SetupContext } from '../types';
import { Logger } from '../../../utils/logger';
import { getDefaultDataConfig } from './dataConfig';

const logger = Logger.getInstance();

export async function createDefaultProducts(
  client: PoolClient,
  establishmentId: string,
  categoryMap: Map<string, string>,
  context?: SetupContext
): Promise<void> {
  void context;
  const config = getDefaultDataConfig();

  logger.info('Creating default products', { establishmentId, count: config.products.length }, 'SETUP_DEFAULTS');

  for (const product of config.products) {
    const categoryId = categoryMap.get(product.category_name);
    if (!categoryId) {
      logger.warn('Category not found for product', { establishmentId, productName: product.name, categoryName: product.category_name }, 'SETUP_DEFAULTS');
      continue;
    }

    await client.query(
      `
      INSERT INTO products (
        establishment_id, category_id, name, description, price, tax_rate,
        is_active, is_happy_hour_eligible, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
      [
        establishmentId,
        categoryId,
        product.name,
        product.description,
        product.price,
        product.tax_rate,
        product.is_active
      ]
    );
  }

  logger.info('Default products created successfully', { establishmentId, productsCreated: config.products.length }, 'SETUP_DEFAULTS');
}


