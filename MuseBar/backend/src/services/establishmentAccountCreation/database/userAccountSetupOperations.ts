import { PoolClient } from 'pg';
import bcrypt from 'bcrypt';
import { Logger } from '../../../utils/logger';
import { UserQueries } from '../../../utils/database';
import { MembershipModel } from '../../../models/membership';
import type { SetupUserAccountInput } from './userAccountTypes';

const logger = Logger.getInstance();

export async function checkUserExists(
  client: PoolClient,
  email: string
): Promise<{ exists: boolean; userId?: number; hasEstablishment?: boolean }> {
  try {
    const existing = await UserQueries.checkUserExists(client, email);
    if (!existing.exists) {
      return { exists: false };
    }

    const userRecord = existing.user as { id?: number | string } | undefined;
    const parsedUserId = Number(userRecord?.id);

    return {
      exists: true,
      userId: Number.isFinite(parsedUserId) ? parsedUserId : undefined,
      hasEstablishment: existing.hasEstablishment
    };
  } catch (error) {
    logger.error('Error checking user existence:', error as Error);
    throw new Error('Failed to check user existence');
  }
}

export async function createOrUpdateUserAccount(
  client: PoolClient,
  setupData: SetupUserAccountInput,
  establishmentId: string
) {
  try {
    const existingUser = await checkUserExists(client, setupData.email);

    if (existingUser.exists) {
      const updateResult = await client.query(
        `UPDATE users
           SET
             first_name = $1,
             last_name = $2,
             phone = $3,
             establishment_id = $4,
             role = 'establishment_admin',
             is_admin = false,
             updated_at = CURRENT_TIMESTAMP
           WHERE email = $5
           RETURNING id, email, first_name, last_name, establishment_id`,
        [
          setupData.first_name,
          setupData.last_name,
          setupData.phone,
          establishmentId,
          setupData.email
        ]
      );

      const updated = updateResult.rows[0];
      if (updated?.id) {
        await client.query(
          `INSERT INTO user_establishment_memberships (user_id, establishment_id, role, is_active)
             VALUES ($1, $2, 'establishment_admin', TRUE)
             ON CONFLICT (user_id, establishment_id) DO UPDATE
             SET role = 'establishment_admin', is_active = TRUE, updated_at = CURRENT_TIMESTAMP`,
          [updated.id, establishmentId]
        );
        await MembershipModel.ensureCalendarColor(Number(updated.id), establishmentId, client);
      }

      logger.info(`Updated existing user: ${setupData.email}`);
      return updated;
    }

    const hashedPassword = await bcrypt.hash(setupData.password, 12);
    const newUserResult = await client.query(
      `INSERT INTO users (
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
         ) VALUES ($1, $2, $3, $4, $5, $6, 'establishment_admin', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, email, first_name, last_name, establishment_id`,
      [
        setupData.first_name,
        setupData.last_name,
        setupData.email,
        hashedPassword,
        setupData.phone,
        establishmentId
      ]
    );

    const created = newUserResult.rows[0];
    if (created?.id) {
      await client.query(
        `INSERT INTO user_establishment_memberships (user_id, establishment_id, role, is_active)
           VALUES ($1, $2, 'establishment_admin', TRUE)
           ON CONFLICT (user_id, establishment_id) DO NOTHING`,
        [created.id, establishmentId]
      );
      await MembershipModel.ensureCalendarColor(Number(created.id), establishmentId, client);
    }

    logger.info(`Created new user: ${setupData.email}`);
    return created;
  } catch (error) {
    logger.error('Error creating/updating user account:', error as Error);
    throw new Error('Failed to create or update user account');
  }
}

export async function validateUserCredentials(
  client: PoolClient,
  email: string,
  password: string
): Promise<boolean> {
  try {
    const userQuery = await client.query(
      `SELECT password_hash
         FROM users
         WHERE email = $1`,
      [email]
    );

    if (userQuery.rows.length === 0) {
      return false;
    }

    const { password_hash } = userQuery.rows[0] as { password_hash: string };
    return await bcrypt.compare(password, password_hash);
  } catch (error) {
    logger.error('Error validating user credentials:', error as Error);
    return false;
  }
}

export async function updateUserRole(
  client: PoolClient,
  userId: number,
  role: string,
  isAdmin: boolean = false
): Promise<void> {
  try {
    await client.query(
      `UPDATE users
         SET
           role = $1,
           is_admin = $2,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
      [role, isAdmin, userId]
    );

    logger.info(`Updated user role: ${userId} -> ${role} (admin: ${isAdmin})`);
  } catch (error) {
    logger.error('Error updating user role:', error as Error);
    throw new Error('Failed to update user role');
  }
}

export async function getUserWithEstablishment(client: PoolClient, userId: number) {
  try {
    return await UserQueries.getUserWithEstablishment(client, userId);
  } catch (error) {
    logger.error('Error getting user with establishment:', error as Error);
    throw new Error('Failed to retrieve user information');
  }
}
