import { AuditTrailModel } from '../../models/auditTrail';
import { TokenBlocklistModel } from '../../models/tokenBlocklist';
import { Logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

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

export async function revokeTokenOrThrow(token: string, userId: number, reason: string): Promise<void> {
  try {
    await TokenBlocklistModel.revokeToken(token, { userId, reason });
  } catch (error) {
    Logger.getInstance().error(
      `Token revocation failed (${reason})`,
      error as Error,
      'AUTH_ROUTE'
    );
    throw new AppError('Failed to revoke token', 500, 'TOKEN_REVOCATION_FAILED', { reason });
  }
}
