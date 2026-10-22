import { AuditTrailModel } from '../../models/auditTrail';
import { Logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';
import { requireEstablishmentAdminOrPermission } from '../../middleware/auth';
import { P } from '../../permissions/registry';

export const canManageUsers = requireEstablishmentAdminOrPermission(P.access_user_management);

/** Roles assignable for establishment users via POST/PUT `/api/auth/users` (not system_admin). */
export const ESTABLISHMENT_USER_ROLES: readonly string[] = ['establishment_admin', 'staff'];

export async function logAuditOrThrow(
  entry: Parameters<typeof AuditTrailModel.logAction>[0],
  context: string
): Promise<void> {
  try {
    await AuditTrailModel.logAction(entry);
  } catch (error) {
    Logger.getInstance().error(
      `Audit trail logging failed (${context})`,
      error as Error,
      'AUTH_ROUTE'
    );
    throw new AppError('Failed to persist audit trail entry', 500, 'AUDIT_LOG_FAILURE', { context });
  }
}
