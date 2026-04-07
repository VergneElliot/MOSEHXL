import { PoolClient } from 'pg';
import { SetupContext } from '../types';
import { Logger } from '../../../utils/logger';
import { getDefaultDataConfig } from './dataConfig';

const logger = Logger.getInstance();

export async function createDefaultCategories(
  client: PoolClient,
  establishmentId: string,
  context?: SetupContext
): Promise<Map<string, string>> {
  void context;
  const config = getDefaultDataConfig();
  const categoryMap = new Map<string, string>();

  logger.info('Creating default categories', { establishmentId, count: config.categories.length }, 'SETUP_DEFAULTS');

  for (const category of config.categories) {
    const result = await client.query(
      `
      INSERT INTO categories (
        establishment_id, name, description, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `,
      [establishmentId, category.name, category.description, category.is_active]
    );
    categoryMap.set(category.name, result.rows[0].id);
  }

  logger.info('Default categories created successfully', { establishmentId, categoriesCreated: categoryMap.size }, 'SETUP_DEFAULTS');
  return categoryMap;
}


