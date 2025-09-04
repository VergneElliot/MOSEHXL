/**
 * User Account Operations
 * Handles user account creation, updates, and existence checks
 */

import bcrypt from 'bcrypt';
import { PoolClient } from 'pg';
import {
  BusinessSetupRequest,
  UserExistsResult
} from './types';
import { Logger } from '../../utils/logger';
import { UserQueries } from '../../utils/database';

/**
 * User account database operations
 */
export class UserAccountOperations {
  private static logger = Logger.getInstance();

  /**
   * Check if user exists by email
   * Uses shared query utility to eliminate duplication
   */
  static async checkUserExists(
    client: PoolClient,
    email: string
  ): Promise<UserExistsResult> {
    try {
      return await UserQueries.checkUserExists(client, email);
    } catch (error) {
      this.logger.error('Error checking user existence:', error);
      throw new Error('Failed to check user existence');
    }
  }

  /**
   * Create or update user account
   */
  static async createOrUpdateUserAccount(
    client: PoolClient,
    setupData: BusinessSetupRequest,
    establishmentId: string
  ) {
    try {
      // Check if user already exists
      const existingUser = await this.checkUserExists(client, setupData.email);
      
      if (existingUser.exists) {
        // Update existing user
        const updateResult = await client.query(`
          UPDATE users 
          SET 
            first_name = $1,
            last_name = $2,
            phone = $3,
            establishment_id = $4,
            role = 'admin',
            is_admin = true,
            updated_at = CURRENT_TIMESTAMP
          WHERE email = $5
          RETURNING id, email, first_name, last_name, establishment_id
        `, [
          setupData.first_name,
          setupData.last_name,
          setupData.phone,
          establishmentId,
          setupData.email
        ]);

        this.logger.info(`Updated existing user: ${setupData.email}`);
        return updateResult.rows[0];
      } else {
        // Create new user
        return await this.createNewUser(client, setupData, establishmentId);
      }

    } catch (error) {
      this.logger.error('Error creating/updating user account:', error);
      throw new Error('Failed to create or update user account');
    }
  }

  /**
   * Create new user account
   */
  private static async createNewUser(
    client: PoolClient,
    setupData: BusinessSetupRequest,
    establishmentId: string
  ) {
    try {
      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(setupData.password, saltRounds);

      // Create new user
      const newUserResult = await client.query(`
        INSERT INTO users (
          first_name, 
          last_name, 
          email, 
          password_hash, 
          phone, 
          establishment_id,
          role,
          is_admin,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, email, first_name, last_name, establishment_id
      `, [
        setupData.first_name,
        setupData.last_name,
        setupData.email,
        hashedPassword,
        setupData.phone,
        establishmentId
      ]);

      this.logger.info(`Created new user: ${setupData.email}`);
      return newUserResult.rows[0];

    } catch (error) {
      this.logger.error('Error creating new user:', error);
      throw new Error('Failed to create new user account');
    }
  }

  /**
   * Validate user credentials during setup
   */
  static async validateUserCredentials(
    client: PoolClient,
    email: string,
    password: string
  ): Promise<boolean> {
    try {
      const userQuery = await client.query(`
        SELECT password_hash
        FROM users
        WHERE email = $1
      `, [email]);

      if (userQuery.rows.length === 0) {
        return false;
      }

      const { password_hash } = userQuery.rows[0];
      return await bcrypt.compare(password, password_hash);

    } catch (error) {
      this.logger.error('Error validating user credentials:', error);
      return false;
    }
  }

  /**
   * Update user role and permissions
   */
  static async updateUserRole(
    client: PoolClient,
    userId: number,
    role: string,
    isAdmin: boolean = false
  ): Promise<void> {
    try {
      await client.query(`
        UPDATE users 
        SET 
          role = $1,
          is_admin = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [role, isAdmin, userId]);

      this.logger.info(`Updated user role: ${userId} -> ${role} (admin: ${isAdmin})`);

    } catch (error) {
      this.logger.error('Error updating user role:', error);
      throw new Error('Failed to update user role');
    }
  }

  /**
   * Get user by ID with establishment info
   * Uses shared query utility to eliminate duplication
   */
  static async getUserWithEstablishment(
    client: PoolClient,
    userId: number
  ) {
    try {
      return await UserQueries.getUserWithEstablishment(client, userId);
    } catch (error) {
      this.logger.error('Error getting user with establishment:', error);
      throw new Error('Failed to retrieve user information');
    }
  }
}
