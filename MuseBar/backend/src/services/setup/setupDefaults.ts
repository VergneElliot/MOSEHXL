/**
 * Setup Defaults - Default Data Creation
 * Handles creation of default data for new establishments
 */

import { PoolClient } from 'pg';
import { DefaultDataConfig, SetupContext } from './types';
import { Logger } from '../../utils/logger';
import { getDefaultDataConfig, createDefaultCategories as createCategories, createDefaultProducts as createProducts, createDefaultSettings as createSettings } from './defaults';
import { createDefaultPaymentMethods as createPaymentMethods } from './defaults';

/**
 * Setup Default Data Service
 */
export class SetupDefaults {
  private static logger = Logger.getInstance();

  /**
   * Get default data configuration
   */
  static getDefaultDataConfig(): DefaultDataConfig {
    return getDefaultDataConfig();
  }

  /**
   * Create default categories
   */
  static async createDefaultCategories(
    client: PoolClient,
    establishmentId: string,
    context?: SetupContext
  ): Promise<Map<string, string>> {
    return await createCategories(client, establishmentId, context);
  }

  /**
   * Create default products
   */
  static async createDefaultProducts(
    client: PoolClient,
    establishmentId: string,
    categoryMap: Map<string, string>,
    context?: SetupContext
  ): Promise<void> {
    await createProducts(client, establishmentId, categoryMap, context);
  }

  /**
   * Create default settings
   */
  static async createDefaultSettings(
    client: PoolClient,
    establishmentId: string,
    context?: SetupContext
  ): Promise<void> {
    await createSettings(client, establishmentId, context);
  }

  /**
   * Create default payment methods
   */
  static async createDefaultPaymentMethods(
    client: PoolClient,
    establishmentId: string,
    context?: SetupContext
  ): Promise<void> {
    await createPaymentMethods(client, establishmentId);
  }

  /**
   * Create all default data
   */
  static async createAllDefaultData(
    client: PoolClient,
    establishmentId: string,
    context?: SetupContext
  ): Promise<void> {
    try {
      this.logger.info(
        'Starting default data creation',
        { establishmentId },
        'SETUP_DEFAULTS'
      );

      // Create categories first (needed for products)
      const categoryMap = await this.createDefaultCategories(client, establishmentId, context);

      // Create products using category map
      await this.createDefaultProducts(client, establishmentId, categoryMap, context);

      // Create settings
      await this.createDefaultSettings(client, establishmentId, context);

      // Create payment methods
      await this.createDefaultPaymentMethods(client, establishmentId, context);

      this.logger.info(
        'All default data created successfully',
        { establishmentId },
        'SETUP_DEFAULTS'
      );
    } catch (error) {
      this.logger.error(
        'Error creating default data',
        error as Error,
        'SETUP_DEFAULTS'
      );
      throw error;
    }
  }

  /**
   * Customize default data based on business type
   */
  static async customizeForBusinessType(
    client: PoolClient,
    establishmentId: string,
    businessType: 'cafe' | 'restaurant' | 'bar' | 'retail',
    context?: SetupContext
  ): Promise<void> {
    try {
      this.logger.info(
        'Customizing default data for business type',
        undefined,
        'SETUP_DEFAULTS'
      );

      switch (businessType) {
        case 'bar':
          await this.addBarSpecificData(client, establishmentId);
          break;
        case 'restaurant':
          await this.addRestaurantSpecificData(client, establishmentId);
          break;
        case 'retail':
          await this.addRetailSpecificData(client, establishmentId);
          break;
        case 'cafe':
        default:
          // Default cafe setup already applied
          break;
      }

      this.logger.info(
        'Business type customization completed',
        undefined,
        'SETUP_DEFAULTS'
      );
    } catch (error) {
      this.logger.error(
        'Error customizing for business type',
        error as Error,
        'SETUP_DEFAULTS'
      );
      throw error;
    }
  }

  /**
   * Add bar-specific products and categories
   */
  private static async addBarSpecificData(
    client: PoolClient,
    establishmentId: string
  ): Promise<void> {
    // Add alcoholic beverages category
    const categoryResult = await client.query(`
      INSERT INTO categories (
        establishment_id, name, description, is_active, created_at, updated_at
      ) VALUES ($1, 'Boissons Alcoolisées', 'Bières, vins, spiritueux', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [establishmentId]);

    const alcoholCategoryId = categoryResult.rows[0].id;

    // Add bar-specific products
    const barProducts = [
      { name: 'Bière Pression', description: 'Bière à la pression', price: 4.50, tax_rate: 0.20 },
      { name: 'Verre de Vin', description: 'Vin rouge ou blanc', price: 6.00, tax_rate: 0.20 },
      { name: 'Cocktail', description: 'Cocktail maison', price: 8.00, tax_rate: 0.20 }
    ];

    for (const product of barProducts) {
      await client.query(`
        INSERT INTO products (
          establishment_id, category_id, name, description, price, tax_rate,
          is_active, is_happy_hour_eligible, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        establishmentId,
        alcoholCategoryId,
        product.name,
        product.description,
        product.price,
        product.tax_rate
      ]);
    }
  }

  /**
   * Add restaurant-specific products and categories
   */
  private static async addRestaurantSpecificData(
    client: PoolClient,
    establishmentId: string
  ): Promise<void> {
    // Add menu categories
    const categories = [
      { name: 'Entrées', description: 'Hors-d\'œuvres et entrées' },
      { name: 'Plats Principaux', description: 'Plats de résistance' },
      { name: 'Accompagnements', description: 'Garnitures et accompagnements' }
    ];

    for (const category of categories) {
      await client.query(`
        INSERT INTO categories (
          establishment_id, name, description, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [establishmentId, category.name, category.description]);
    }
  }

  /**
   * Add retail-specific products and categories
   */
  private static async addRetailSpecificData(
    client: PoolClient,
    establishmentId: string
  ): Promise<void> {
    // Add retail-specific settings
    const retailSettings = {
      inventory_tracking: true,
      low_stock_alerts: true,
      barcode_scanning: true,
      customer_loyalty: false
    };

    for (const [key, value] of Object.entries(retailSettings)) {
      await client.query(`
        INSERT INTO establishment_settings (
          establishment_id, setting_key, setting_value, created_at, updated_at
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [establishmentId, key, JSON.stringify(value)]);
    }
  }

  /**
   * Remove default data (for cleanup)
   */
  static async removeDefaultData(
    client: PoolClient,
    establishmentId: string
  ): Promise<void> {
    try {
      // Remove in reverse dependency order
      await client.query('DELETE FROM products WHERE establishment_id = $1', [establishmentId]);
      await client.query('DELETE FROM categories WHERE establishment_id = $1', [establishmentId]);
      await client.query('DELETE FROM payment_methods WHERE establishment_id = $1', [establishmentId]);
      await client.query('DELETE FROM establishment_settings WHERE establishment_id = $1', [establishmentId]);

      this.logger.info(
        'Default data removed successfully',
        undefined,
        'SETUP_DEFAULTS'
      );
    } catch (error) {
      this.logger.error(
        'Error removing default data',
        error as Error,
        'SETUP_DEFAULTS'
      );
      throw error;
    }
  }
}

