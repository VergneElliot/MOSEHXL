import { AuditTrailModel } from '../../../models/auditTrail';

export async function logViewRoles(userId: number, establishmentId: string, roleCount: number, ip?: string, userAgent?: string) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'VIEW_ROLES',
    action_details: { establishmentId, roleCount },
    ip_address: ip,
    user_agent: userAgent
  });
}

export async function logViewRoleDetails(userId: number, roleId: string, establishmentId: string, ip?: string, userAgent?: string) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'VIEW_ROLE_DETAILS',
    action_details: { roleId, establishmentId },
    ip_address: ip,
    user_agent: userAgent
  });
}

export async function logCreateCustomRole(
  userId: number,
  params: { roleId: string; roleName: string; establishmentId: string; permissions: unknown; },
  ip?: string,
  userAgent?: string
) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'CREATE_CUSTOM_ROLE',
    action_details: params,
    ip_address: ip,
    user_agent: userAgent
  });
}

export async function logUpdateCustomRole(
  userId: number,
  params: { roleId: string; updates: Record<string, unknown>; establishmentId: string; },
  ip?: string,
  userAgent?: string
) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'UPDATE_CUSTOM_ROLE',
    action_details: params,
    ip_address: ip,
    user_agent: userAgent
  });
}

export async function logDeleteCustomRole(userId: number, params: { roleId: string; roleName: string; establishmentId: string; }, ip?: string, userAgent?: string) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'DELETE_CUSTOM_ROLE',
    action_details: params,
    ip_address: ip,
    user_agent: userAgent
  });
}


