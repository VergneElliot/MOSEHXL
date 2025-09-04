/**
 * Establishment Operations
 * Handles establishment setup, schema initialization, and information updates
 */

import { PoolClient } from 'pg';
import {
  BusinessSetupRequest,
  SetupProgress
} from './types';
import { Logger } from '../../utils/logger';
import { initializeEstablishmentSchema } from './db';
import { logSetupProgress as logProgress } from './db';

/**
 * Establishment database operations
 */
export class EstablishmentOperations {
  private static logger = Logger.getInstance();

  /**
   * Update establishment information
   */
  static async updateEstablishmentInfo(
    client: PoolClient,
    establishmentId: string,
    setupData: BusinessSetupRequest
  ): Promise<void> {
    try {
      await client.query(`
        UPDATE establishments 
        SET 
          name = $1,
          address = $2,
          phone = $3,
          email = $4,
          siret = $5,
          vat_number = $6,
          timezone = $7,
          currency = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
      `, [
        setupData.business_name,
        setupData.address,
        setupData.phone,
        setupData.contact_email,
        setupData.siret_number,
        setupData.tva_number,
        'Europe/Paris', // Default timezone
        'EUR', // Default currency
        establishmentId
      ]);

      this.logger.info(`Updated establishment info for: ${establishmentId}`);

    } catch (error) {
      this.logger.error('Error updating establishment info:', error);
      throw new Error('Failed to update establishment information');
    }
  }

  /**
   * Initialize establishment schema
   */
  static async initializeEstablishmentSchema(establishmentId: string): Promise<void> {
    try {
      await initializeEstablishmentSchema(establishmentId);
      this.logger.info(`Initialized schema for establishment: ${establishmentId}`);
    } catch (error) {
      this.logger.error('Error initializing establishment schema:', error);
      throw new Error('Failed to initialize establishment schema');
    }
  }

  /**
   * Mark establishment as active
   */
  static async activateEstablishment(
    client: PoolClient,
    establishmentId: string
  ): Promise<void> {
    try {
      await client.query(`
        UPDATE establishments 
        SET 
          status = 'active',
          activated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [establishmentId]);

      this.logger.info(`Activated establishment: ${establishmentId}`);

    } catch (error) {
      this.logger.error('Error activating establishment:', error);
      throw new Error('Failed to activate establishment');
    }
  }

  /**
   * Get establishment information
   */
  static async getEstablishmentInfo(
    client: PoolClient,
    establishmentId: string
  ) {
    try {
      const establishmentQuery = await client.query(`
        SELECT 
          id,
          name,
          email,
          address,
          phone,
          siret,
          vat_number,
          timezone,
          currency,
          status,
          created_at,
          activated_at
        FROM establishments
        WHERE id = $1
      `, [establishmentId]);

      return establishmentQuery.rows[0] || null;

    } catch (error) {
      this.logger.error('Error getting establishment info:', error);
      throw new Error('Failed to retrieve establishment information');
    }
  }

  /**
   * Create establishment defaults (products, categories, etc.)
   */
  static async createEstablishmentDefaults(
    client: PoolClient,
    establishmentId: string
  ): Promise<void> {
    try {
      // Create default categories
      await this.createDefaultCategories(client, establishmentId);
      
      // Create default products
      await this.createDefaultProducts(client, establishmentId);
      
      // Create default payment methods
      await this.createDefaultPaymentMethods(client, establishmentId);

      this.logger.info(`Created defaults for establishment: ${establishmentId}`);

    } catch (error) {
      this.logger.error('Error creating establishment defaults:', error);
      throw new Error('Failed to create establishment defaults');
    }
  }

  /**
   * Create default categories
   */
  private static async createDefaultCategories(
    client: PoolClient,
    establishmentId: string
  ): Promise<void> {
    const defaultCategories = [
      { name: 'Boissons', description: 'Boissons alcoolisées et non-alcoolisées' },
      { name: 'Snacks', description: 'Collations et en-cas' },
      { name: 'Plats', description: 'Plats principaux' }
    ];

    for (const category of defaultCategories) {
      await client.query(`
        INSERT INTO categories (name, description, establishment_id, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (name, establishment_id) DO NOTHING
      `, [category.name, category.description, establishmentId]);
    }
  }

  /**
   * Create default products
   */
  private static async createDefaultProducts(
    client: PoolClient,
    establishmentId: string
  ): Promise<void> {
    // Get the Boissons category
    const categoryQuery = await client.query(`
      SELECT id FROM categories 
      WHERE name = 'Boissons' AND establishment_id = $1
    `, [establishmentId]);

    if (categoryQuery.rows.length > 0) {
      const categoryId = categoryQuery.rows[0].id;
      
      const defaultProducts = [
        { name: 'Café', price: 2.50, category_id: categoryId },
        { name: 'Thé', price: 2.00, category_id: categoryId },
        { name: 'Jus d\'orange', price: 3.50, category_id: categoryId }
      ];

      for (const product of defaultProducts) {
        await client.query(`
          INSERT INTO products (name, price, category_id, establishment_id, created_at, is_active)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, true)
          ON CONFLICT (name, establishment_id) DO NOTHING
        `, [product.name, product.price, product.category_id, establishmentId]);
      }
    }
  }

  /**
   * Create default payment methods
   */
  private static async createDefaultPaymentMethods(
    client: PoolClient,
    establishmentId: string
  ): Promise<void> {
    const defaultPaymentMethods = [
      { name: 'Espèces', type: 'cash', is_active: true },
      { name: 'Carte bancaire', type: 'card', is_active: true },
      { name: 'Chèque', type: 'check', is_active: false }
    ];

    for (const method of defaultPaymentMethods) {
      await client.query(`
        INSERT INTO payment_methods (name, type, establishment_id, is_active, created_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (name, establishment_id) DO NOTHING
      `, [method.name, method.type, establishmentId, method.is_active]);
    }
  }

  /**
   * Log setup progress
   */
  static async logSetupProgress(
    client: PoolClient, 
    establishmentId: string, 
    progress: SetupProgress
  ): Promise<void> {
    try {
      await logProgress(client, establishmentId, progress);
    } catch (error) {
      this.logger.error('Error logging setup progress:', error);
      throw new Error('Failed to log setup progress');
    }
  }
}
