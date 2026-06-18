/**
 * Setup Database - Main Database Coordinator
 * REFACTORED: Main setup database that delegates to specialized modules
 * The original 434-line database has been modularized into:
 * - invitationOperations.ts (Invitation management)
 * - establishmentAccountCreation/database/UserAccountOperations.ts (canonical user account operations)
 * - establishmentOperations.ts (Establishment setup)
 * - transactionOperations.ts (Transaction management)
 * - setupDatabase.ts (Main coordinator)
 */

import { PoolClient } from 'pg';
import {
  BusinessSetupRequest,
  InvitationValidation,
  UserExistsResult,
  TransactionContext,
  SetupProgress
} from './types';
import { InvitationOperations } from './invitationOperations';
import { UserAccountOperations } from '../establishmentAccountCreation/database/UserAccountOperations';
import { EstablishmentOperations } from './establishmentOperations';
import { TransactionOperations } from './transactionOperations';
import { Logger } from '../../utils/logger';

/**
 * Main setup database coordinator - delegates to specialized modules
 */
export class SetupDatabase {
  private static logger = Logger.getInstance();

  private static isPoolLike(pool: unknown): pool is { connect: () => Promise<PoolClient> } {
    return typeof (pool as { connect?: unknown })?.connect === 'function';
  }

  // ===== INVITATION OPERATIONS =====
  
  /**
   * Validate invitation token
   */
  static async validateInvitation(
    pool: unknown,
    token: string
  ): Promise<InvitationValidation> {
    if (!this.isPoolLike(pool)) throw new Error('Invalid pool provided to validateInvitation');
    return InvitationOperations.validateInvitation(pool, token);
  }

  /**
   * Check setup status for invitation
   */
  static async checkSetupStatus(pool: unknown, token: string) {
    if (!this.isPoolLike(pool)) throw new Error('Invalid pool provided to checkSetupStatus');
    return InvitationOperations.checkSetupStatus(pool, token);
  }

  /**
   * Validate invitation for setup process
   */
  static async validateInvitationForSetup(client: PoolClient, token: string) {
    return InvitationOperations.validateInvitationForSetup(client, token);
  }

  /**
   * Complete invitation process
   */
  static async completeInvitation(
    client: PoolClient,
    token: string,
    userId: number
  ): Promise<void> {
    return InvitationOperations.completeInvitation(client, token, userId);
  }

  // ===== USER ACCOUNT OPERATIONS =====

  /**
   * Check if user exists by email
   */
  static async checkUserExists(
    client: PoolClient,
    email: string
  ): Promise<UserExistsResult> {
    return UserAccountOperations.checkUserExists(client, email);
  }

  /**
   * Create or update user account
   */
  static async createOrUpdateUserAccount(
    client: PoolClient,
    setupData: BusinessSetupRequest,
    establishmentId: string
  ) {
    return UserAccountOperations.createOrUpdateUserAccount(client, setupData, establishmentId);
  }

  /**
   * Validate user credentials during setup
   */
  static async validateUserCredentials(
    client: PoolClient,
    email: string,
    password: string
  ): Promise<boolean> {
    return UserAccountOperations.validateUserCredentials(client, email, password);
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
    return UserAccountOperations.updateUserRole(client, userId, role, isAdmin);
  }

  /**
   * Get user by ID with establishment info
   */
  static async getUserWithEstablishment(client: PoolClient, userId: number) {
    return UserAccountOperations.getUserWithEstablishment(client, userId);
  }

  // ===== ESTABLISHMENT OPERATIONS =====

  /**
   * Update establishment information
   */
  static async updateEstablishmentInfo(
    client: PoolClient,
    establishmentId: string,
    setupData: BusinessSetupRequest
  ): Promise<void> {
    return EstablishmentOperations.updateEstablishmentInfo(client, establishmentId, setupData);
  }

  /**
   * Initialize establishment schema
   */
  static async initializeEstablishmentSchema(establishmentId: string): Promise<void> {
    return EstablishmentOperations.initializeEstablishmentSchema(establishmentId);
  }

  /**
   * Mark establishment as active
   */
  static async activateEstablishment(
    client: PoolClient,
    establishmentId: string
  ): Promise<void> {
    return EstablishmentOperations.activateEstablishment(client, establishmentId);
  }

  /**
   * Get establishment information
   */
  static async getEstablishmentInfo(client: PoolClient, establishmentId: string) {
    return EstablishmentOperations.getEstablishmentInfo(client, establishmentId);
  }

  /**
   * Create establishment defaults
   */
  static async createEstablishmentDefaults(
    client: PoolClient,
    establishmentId: string
  ): Promise<void> {
    return EstablishmentOperations.createEstablishmentDefaults(client, establishmentId);
  }

  /**
   * Log setup progress
   */
  static async logSetupProgress(
    client: PoolClient, 
    establishmentId: string, 
    progress: SetupProgress
  ): Promise<void> {
    return EstablishmentOperations.logSetupProgress(client, establishmentId, progress);
  }

  // ===== TRANSACTION OPERATIONS =====

  /**
   * Create transaction context
   */
  static async createTransactionContext(pool: unknown): Promise<TransactionContext> {
    if (!this.isPoolLike(pool)) throw new Error('Invalid pool provided to createTransactionContext');
    return TransactionOperations.createTransactionContext(pool);
  }

  /**
   * Commit transaction
   */
  static async commitTransaction(
    client: PoolClient,
    context?: TransactionContext
  ): Promise<void> {
    return TransactionOperations.commitTransaction(client, context);
  }

  /**
   * Rollback transaction
   */
  static async rollbackTransaction(
    client: PoolClient,
    context?: TransactionContext,
    error?: Error
  ): Promise<void> {
    return TransactionOperations.rollbackTransaction(client, context, error);
  }

  /**
   * Clean up failed setup
   */
  static async cleanupFailedSetup(
    client: PoolClient,
    establishmentId: string,
    userId?: number
  ): Promise<void> {
    return TransactionOperations.cleanupFailedSetup(client, establishmentId, userId);
  }

  /**
   * Execute with transaction wrapper
   */
  static async executeWithTransaction<T>(
    pool: unknown,
    operation: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.isPoolLike(pool)) throw new Error('Invalid pool provided to executeWithTransaction');
    return TransactionOperations.executeWithTransaction(pool, operation);
  }

  // ===== UTILITY METHODS =====

  /**
   * Get transaction status
   */
  static async getTransactionStatus(client: PoolClient): Promise<string> {
    return TransactionOperations.getTransactionStatus(client);
  }

  /**
   * Create savepoint
   */
  static async createSavepoint(client: PoolClient, savepointName: string): Promise<void> {
    return TransactionOperations.createSavepoint(client, savepointName);
  }

  /**
   * Rollback to savepoint
   */
  static async rollbackToSavepoint(client: PoolClient, savepointName: string): Promise<void> {
    return TransactionOperations.rollbackToSavepoint(client, savepointName);
  }

  /**
   * Release savepoint
   */
  static async releaseSavepoint(client: PoolClient, savepointName: string): Promise<void> {
    return TransactionOperations.releaseSavepoint(client, savepointName);
  }
}