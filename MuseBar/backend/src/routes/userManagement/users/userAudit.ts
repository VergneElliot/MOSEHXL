import { AuditTrailModel } from '../../../models/auditTrail';

export async function logViewEstablishmentUsers(userId: number, params: { establishmentId: string; userCount: number; filters: any; }, ip: string, userAgent?: string) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'VIEW_ESTABLISHMENT_USERS',
    action_details: params,
    ip_address: ip,
    user_agent: userAgent
  });
}

export async function logViewUserDetails(userId: number, params: { targetUserId: string; establishmentId?: string; }, ip: string, userAgent?: string) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'VIEW_USER_DETAILS',
    action_details: params,
    ip_address: ip,
    user_agent: userAgent
  });
}

export async function logUpdateUser(userId: number, params: { targetUserId: string; updates: any; establishmentId?: string; }, ip: string, userAgent?: string) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'UPDATE_USER',
    action_details: params,
    ip_address: ip,
    user_agent: userAgent
  });
}

export async function logDeactivateOrDeleteUser(userId: number, params: { targetUserId: string; targetUserEmail: string; establishmentId?: string; permanent: boolean; }, ip: string, userAgent?: string) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: params.permanent ? 'DELETE_USER_PERMANENT' : 'DEACTIVATE_USER',
    action_details: params,
    ip_address: ip,
    user_agent: userAgent
  });
}

export async function logReactivateUser(userId: number, params: { targetUserId: string; targetUserEmail: string; establishmentId?: string; }, ip: string, userAgent?: string) {
  await AuditTrailModel.logAction({
    user_id: String(userId),
    action_type: 'REACTIVATE_USER',
    action_details: params,
    ip_address: ip,
    user_agent: userAgent
  });
}


