import { AuditTrailModel } from '../../../models/auditTrail';

export async function logViewTeamStats(
  userId: number,
  establishmentId: string,
  stats: unknown,
  ip?: string,
  userAgent?: string
) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'VIEW_TEAM_STATS',
    action_details: { establishmentId, stats },
    ip_address: ip,
    user_agent: userAgent
  });
}

export async function logViewTeamMembers(userId: number, establishmentId: string, memberCount: number, includeInactive: boolean, ip?: string, userAgent?: string) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'VIEW_TEAM_MEMBERS',
    action_details: { establishmentId, memberCount, includeInactive },
    ip_address: ip,
    user_agent: userAgent
  });
}

export async function logTestEmailConfiguration(userId: number, testEmail: string, result: 'success' | 'failure', ip?: string, userAgent?: string) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'TEST_EMAIL_CONFIGURATION',
    action_details: { testEmail, result },
    ip_address: ip,
    user_agent: userAgent
  });
}

export async function logViewEmailStats(userId: number, ip?: string, userAgent?: string) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'VIEW_EMAIL_STATS',
    action_details: { statsRequested: true },
    ip_address: ip,
    user_agent: userAgent
  });
}

export async function logBulkInviteUsers(userId: number, establishmentId: string, totalInvitations: number, successful: number, failed: number, ip?: string, userAgent?: string) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'BULK_INVITE_USERS',
    action_details: { establishmentId, totalInvitations, successful, failed },
    ip_address: ip,
    user_agent: userAgent
  });
}


