/**
 * Transaction Operations
 * Handles database transactions, cleanup, and rollback operations
 */

import { PoolClient } from 'pg';
import { TransactionContext } from './types';
import { Logger } from '../../utils/logger';

/**
 * Transaction database operations
 */
export class TransactionOperations {
  private static logger = Logger.getInstance();

  /**
   * Create transaction context
   */
  static async createTransactionContext(
    pool: any
  ): Promise<TransactionContext> {
    try {
      const client = await pool.connect();
      await client.query('BEGIN');
      
      return {
        client,
        pool,
        release: () => {
          client.release();
        }
      };

    } catch (error) {
      this.logger.error('Error creating transaction context:', error as Error);
      throw new Error('Failed to create database transaction');
    }
  }

  /**
   * Commit transaction
   */
  static async commitTransaction(
    client: PoolClient,
    context?: TransactionContext
  ): Promise<void> {
    try {
      await client.query('COMMIT');
      
      if (context) {
        context.release();
      }

      this.logger.info('Transaction committed successfully');

    } catch (error) {
      this.logger.error('Error committing transaction:', error as Error);
      
      // Attempt rollback on commit failure
      try {
        await client.query('ROLLBACK');
        if (context) {
          context.release();
        }
      } catch (rollbackError) {
        this.logger.error('Error during rollback after commit failure:', rollbackError as Error);
      }
      
      throw new Error('Failed to commit transaction');
    }
  }

  /**
   * Rollback transaction
   */
  static async rollbackTransaction(
    client: PoolClient,
    context?: TransactionContext,
    error?: Error
  ): Promise<void> {
    try {
      await client.query('ROLLBACK');
      
      if (context) {
        context.release();
      }

      if (error) {
        this.logger.error('Transaction rolled back due to error:', error);
      } else {
        this.logger.info('Transaction rolled back successfully');
      }

    } catch (rollbackError) {
      this.logger.error('Error during transaction rollback:', rollbackError as Error);
      
      if (context) {
        try {
          context.release();
        } catch (releaseError) {
          this.logger.error('Error releasing connection after rollback failure:', releaseError as Error);
        }
      }
      
      throw new Error('Failed to rollback transaction');
    }
  }

  /**
   * Clean up failed setup
   */
  static async cleanupFailedSetup(
    client: PoolClient,
    establishmentId: string,
    userId?: number
  ): Promise<void> {
    try {
      this.logger.warn(`Cleaning up failed setup for establishment: ${establishmentId}`);

      // Delete user if created during this setup
      if (userId) {
        await client.query(`
          DELETE FROM users WHERE id = $1 AND establishment_id = $2
        `, [userId, establishmentId]);
        this.logger.info(`Cleaned up user: ${userId}`);
      }

      // Reset establishment status
      await client.query(`
        UPDATE establishments 
        SET 
          status = 'pending',
          activated_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [establishmentId]);

      // Mark related invitations as pending again
      await client.query(`
        UPDATE user_invitations 
        SET 
          status = 'pending',
          accepted_at = NULL,
          user_id = NULL
        WHERE establishment_id = $1 AND status = 'completed'
      `, [establishmentId]);

      this.logger.info(`Cleanup completed for establishment: ${establishmentId}`);

    } catch (error) {
      this.logger.error('Error during cleanup:', error as Error);
      throw new Error('Failed to cleanup failed setup');
    }
  }

  /**
   * Execute with transaction wrapper
   */
  static async executeWithTransaction<T>(
    pool: any,
    operation: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const context = await this.createTransactionContext(pool);
    
    try {
      const result = await operation(context.client);
      await this.commitTransaction(context.client, context);
      return result;
      
    } catch (error) {
      await this.rollbackTransaction(context.client, context, error as Error);
      throw error;
    }
  }

  /**
   * Check transaction status
   */
  static async getTransactionStatus(client: PoolClient): Promise<string> {
    try {
      const result = await client.query('SELECT txid_current()');
      return result.rows[0]?.txid_current || 'unknown';
    } catch (error) {
      this.logger.error('Error getting transaction status:', error as Error);
      return 'error';
    }
  }

  /**
   * Create savepoint
   */
  static async createSavepoint(
    client: PoolClient,
    savepointName: string
  ): Promise<void> {
    try {
      await client.query(`SAVEPOINT ${savepointName}`);
      this.logger.debug(`Created savepoint: ${savepointName}`);
    } catch (error) {
      this.logger.error(`Error creating savepoint ${savepointName}:`, error as Error);
      throw new Error(`Failed to create savepoint: ${savepointName}`);
    }
  }

  /**
   * Rollback to savepoint
   */
  static async rollbackToSavepoint(
    client: PoolClient,
    savepointName: string
  ): Promise<void> {
    try {
      await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      this.logger.debug(`Rolled back to savepoint: ${savepointName}`);
    } catch (error) {
      this.logger.error(`Error rolling back to savepoint ${savepointName}:`, error as Error);
      throw new Error(`Failed to rollback to savepoint: ${savepointName}`);
    }
  }

  /**
   * Release savepoint
   */
  static async releaseSavepoint(
    client: PoolClient,
    savepointName: string
  ): Promise<void> {
    try {
      await client.query(`RELEASE SAVEPOINT ${savepointName}`);
      this.logger.debug(`Released savepoint: ${savepointName}`);
    } catch (error) {
      this.logger.error(`Error releasing savepoint ${savepointName}:`, error as Error);
      // Don't throw here as this is cleanup
    }
  }
}
