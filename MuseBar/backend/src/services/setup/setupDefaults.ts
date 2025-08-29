/**
 * Setup Defaults - Default Data Creation
 * Handles creation of default data for new establishments
 */

import { PoolClient } from 'pg';
import { DefaultDataConfig, SetupContext } from './types';
import { Logger } from '../../utils/logger';

/**
 * Setup Default Data Service
 */
export class SetupDefaults {
  private static logger = Logger.getInstance();

  /**
   * Get default data configuration
   */
  static getDefaultDataConfig(): DefaultDataConfig {
    return {
      categories: [
        {
          name: 'Boissons',
          description: 'Boissons chaudes et froides',
          is_active: true
        },
        {
          name: 'Snacks',
          description: 'Collations et en-cas',
          is_active: true
        },
        {
          name: 'Desserts',
          description: 'Desserts et pâtisseries',
          is_active: true
        },
        {
          name: 'Plats',
          description: 'Plats principaux',
          is_active: true
        }
      ],
      products: [
        // Boissons
        {
          name: 'Café Expresso',
          description: 'Café expresso traditionnel',
          price: 2.50,
          tax_rate: 0.10,
          category_name: 'Boissons',
          is_active: true
        },
        {
          name: 'Cappuccino',
          description: 'Café expresso avec mousse de lait',
          price: 3.50,
          tax_rate: 0.10,
          category_name: 'Boissons',
          is_active: true
        },
        {
          name: 'Thé',
          description: 'Thé noir ou vert',
          price: 2.00,
          tax_rate: 0.10,
          category_name: 'Boissons',
          is_active: true
        },
        {
          name: 'Soda',
          description: 'Boisson gazeuse',
          price: 2.80,
          tax_rate: 0.20,
          category_name: 'Boissons',
          is_active: true
        },
        // Snacks
        {
          name: 'Croissant',
          description: 'Croissant au beurre',
          price: 1.50,
          tax_rate: 0.10,
          category_name: 'Snacks',
          is_active: true
        },
        {
          name: 'Pain au chocolat',
          description: 'Viennoiserie au chocolat',
          price: 1.80,
          tax_rate: 0.10,
          category_name: 'Snacks',
          is_active: true
        },
        {
          name: 'Sandwich',
          description: 'Sandwich jambon-beurre',
          price: 4.50,
          tax_rate: 0.10,
          category_name: 'Snacks',
          is_active: true
        },
        // Desserts
        {
          name: 'Éclair au chocolat',
          description: 'Pâtisserie à la crème et chocolat',
          price: 3.20,
          tax_rate: 0.10,
          category_name: 'Desserts',
          is_active: true
        },
        {
          name: 'Tarte aux fruits',
          description: 'Tarte saisonnière aux fruits',
          price: 4.00,
          tax_rate: 0.10,
          category_name: 'Desserts',
          is_active: true
        }
      ],
      settings: {
        // Business settings
        business_hours_start: '08:00',
        business_hours_end: '18:00',
        currency: 'EUR',
        tax_included_in_prices: true,
        default_tax_rate: 0.20,
        
        // Happy hour settings
        happy_hour_enabled: false,
        happy_hour_start: '16:00',
        happy_hour_end: '18:00',
        happy_hour_discount: 0.10,
        
        // Receipt settings
        receipt_footer_message: 'Merci de votre visite !',
        print_receipts_by_default: true,
        receipt_language: 'fr',
        
        // System settings
        auto_backup_enabled: true,
        backup_frequency: 'daily',
        notification_email_enabled: true
      }
    };
  }

  /**
   * Create default categories
   */
  static async createDefaultCategories(
    client: PoolClient,
    establishmentId: string,
    context?: SetupContext
  ): Promise<Map<string, string>> {
    const config = this.getDefaultDataConfig();
    const categoryMap = new Map<string, string>();

    try {
      this.logger.info(
        'Creating default categories',
        { establishmentId, count: config.categories.length },
        'SETUP_DEFAULTS'
      );

      for (const category of config.categories) {
        const result = await client.query(`
          INSERT INTO categories (
            establishment_id, name, description, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id
        `, [
          establishmentId,
          category.name,
          category.description,
          category.is_active
        ]);

        categoryMap.set(category.name, result.rows[0].id);
      }

      this.logger.info(
        'Default categories created successfully',
        { establishmentId, categoriesCreated: categoryMap.size },
        'SETUP_DEFAULTS'
      );

      return categoryMap;
    } catch (error) {
      this.logger.error(
        'Error creating default categories',
        error as Error,
        { establishmentId },
        'SETUP_DEFAULTS'
      );
      throw error;
    }
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
    const config = this.getDefaultDataConfig();

    try {
      this.logger.info(
        'Creating default products',
        { establishmentId, count: config.products.length },
        'SETUP_DEFAULTS'
      );

      for (const product of config.products) {
        const categoryId = categoryMap.get(product.category_name);
        if (!categoryId) {
          this.logger.warn(
            `Category not found for product: ${product.name}`,
            { establishmentId, productName: product.name, categoryName: product.category_name },
            'SETUP_DEFAULTS'
          );
          continue;
        }

        await client.query(`
          INSERT INTO products (
            establishment_id, category_id, name, description, price, tax_rate,
            is_active, is_happy_hour_eligible, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          establishmentId,
          categoryId,
          product.name,
          product.description,
          product.price,
          product.tax_rate,
          product.is_active
        ]);
      }

      this.logger.info(
        'Default products created successfully',
        { establishmentId, productsCreated: config.products.length },
        'SETUP_DEFAULTS'
      );
    } catch (error) {
      this.logger.error(
        'Error creating default products',
        error as Error,
        { establishmentId },
        'SETUP_DEFAULTS'
      );
      throw error;
    }
  }

  /**
   * Create default settings
   */
  static async createDefaultSettings(
    client: PoolClient,
    establishmentId: string,
    context?: SetupContext
  ): Promise<void> {
    const config = this.getDefaultDataConfig();

    try {
      this.logger.info(
        'Creating default settings',
        { establishmentId, settingsCount: Object.keys(config.settings).length },
        'SETUP_DEFAULTS'
      );

      for (const [key, value] of Object.entries(config.settings)) {
        await client.query(`
          INSERT INTO establishment_settings (
            establishment_id, setting_key, setting_value, created_at, updated_at
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (establishment_id, setting_key) DO UPDATE SET
            setting_value = EXCLUDED.setting_value,
            updated_at = CURRENT_TIMESTAMP
        `, [
          establishmentId,
          key,
          JSON.stringify(value)
        ]);
      }

      this.logger.info(
        'Default settings created successfully',
        { establishmentId, settingsCreated: Object.keys(config.settings).length },
        'SETUP_DEFAULTS'
      );
    } catch (error) {
      this.logger.error(
        'Error creating default settings',
        error as Error,
        { establishmentId },
        'SETUP_DEFAULTS'
      );
      throw error;
    }
  }

  /**
   * Create default payment methods
   */
  static async createDefaultPaymentMethods(
    client: PoolClient,
    establishmentId: string,
    context?: SetupContext
  ): Promise<void> {
    const paymentMethods = [
      {
        name: 'Espèces',
        code: 'cash',
        is_active: true,
        requires_amount: true,
        description: 'Paiement en liquide'
      },
      {
        name: 'Carte Bancaire',
        code: 'card',
        is_active: true,
        requires_amount: false,
        description: 'Paiement par carte bancaire'
      },
      {
        name: 'Chèque',
        code: 'check',
        is_active: false,
        requires_amount: true,
        description: 'Paiement par chèque'
      }
    ];

    try {
      this.logger.info(
        'Creating default payment methods',
        { establishmentId, count: paymentMethods.length },
        'SETUP_DEFAULTS'
      );

      for (const method of paymentMethods) {
        await client.query(`
          INSERT INTO payment_methods (
            establishment_id, name, code, is_active, requires_amount, description,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          establishmentId,
          method.name,
          method.code,
          method.is_active,
          method.requires_amount,
          method.description
        ]);
      }

      this.logger.info(
        'Default payment methods created successfully',
        { establishmentId, methodsCreated: paymentMethods.length },
        'SETUP_DEFAULTS'
      );
    } catch (error) {
      this.logger.error(
        'Error creating default payment methods',
        error as Error,
        { establishmentId },
        'SETUP_DEFAULTS'
      );
      throw error;
    }
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
        { establishmentId },
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
        { establishmentId, businessType },
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
        { establishmentId, businessType },
        'SETUP_DEFAULTS'
      );
    } catch (error) {
      this.logger.error(
        'Error customizing for business type',
        error as Error,
        { establishmentId, businessType },
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
        { establishmentId },
        'SETUP_DEFAULTS'
      );
    } catch (error) {
      this.logger.error(
        'Error removing default data',
        error as Error,
        { establishmentId },
        'SETUP_DEFAULTS'
      );
      throw error;
    }
  }
}

