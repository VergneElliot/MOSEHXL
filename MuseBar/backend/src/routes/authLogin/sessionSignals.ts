import { CanonicalAuthRole } from '../../auth/roleVocabulary';
import { Logger } from '../../utils/logger';
import { requiresAdminTwoFactor } from './config';

export type SessionDrift = {
  client_id_changed: boolean;
  ip_subnet_changed: boolean;
  user_agent_changed: boolean;
};

export function deriveIpSubnet(ipRaw: string | undefined): string | null {
  if (!ipRaw) {
    return null;
  }
  const trimmed = ipRaw.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
  if (normalized.includes('.')) {
    const parts = normalized.split('.');
    if (parts.length !== 4) {
      return null;
    }
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  if (normalized.includes(':')) {
    const sections = normalized.split(':');
    const firstFour = sections.slice(0, 4).map((section) => section || '0');
    while (firstFour.length < 4) {
      firstFour.push('0');
    }
    return `${firstFour.join(':')}::/64`;
  }
  return null;
}

export function normalizeUserAgent(userAgentRaw: unknown): string | null {
  if (typeof userAgentRaw !== 'string') {
    return null;
  }
  const trimmed = userAgentRaw.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, 512);
}

function computeSessionDrift(
  reference: { clientId?: string | null; ipSubnet?: string | null; userAgent?: string | null },
  current: { clientId: string; ipSubnet: string | null; userAgent: string | null }
): SessionDrift {
  return {
    client_id_changed:
      typeof reference.clientId === 'string' &&
      reference.clientId.length > 0 &&
      reference.clientId !== current.clientId,
    ip_subnet_changed:
      typeof reference.ipSubnet === 'string' &&
      reference.ipSubnet.length > 0 &&
      reference.ipSubnet !== (current.ipSubnet ?? null),
    user_agent_changed:
      typeof reference.userAgent === 'string' &&
      reference.userAgent.length > 0 &&
      current.userAgent !== null &&
      reference.userAgent !== current.userAgent,
  };
}

function scoreSessionDrift(
  drift: SessionDrift,
  options: { adminSensitive: boolean }
): { score: number; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' } {
  let score = 0;
  if (drift.client_id_changed) score += 45;
  if (drift.ip_subnet_changed) score += 30;
  if (drift.user_agent_changed) score += 20;
  if (options.adminSensitive && score > 0) score += 15;

  if (score >= 85) return { score, severity: 'CRITICAL' };
  if (score >= 65) return { score, severity: 'HIGH' };
  if (score >= 35) return { score, severity: 'MEDIUM' };
  return { score, severity: 'LOW' };
}

function logSessionAnomalySignal(
  eventName: string,
  drift: SessionDrift,
  context: {
    familyId?: string;
    endpoint: string;
    role?: string;
    userId: number;
    requestId?: string;
    adminSensitive: boolean;
  }
): void {
  if (!drift.client_id_changed && !drift.ip_subnet_changed && !drift.user_agent_changed) {
    return;
  }

  const { score, severity } = scoreSessionDrift(drift, {
    adminSensitive: context.adminSensitive,
  });

  try {
    Logger.getInstance().security(
      eventName,
      severity,
      {
        endpoint: context.endpoint,
        role: context.role,
        family_id: context.familyId,
        drift,
        score,
        admin_sensitive: context.adminSensitive,
      },
      context.requestId,
      context.userId
    );
  } catch {
    // Security signaling is best-effort and must never break auth flows.
  }
}

export function logRefreshSessionAnomalySignal(
  refreshSession: { client_id?: string | null; ip_subnet?: string | null; user_agent?: string | null; family_id: string },
  current: {
    clientId: string;
    ipSubnet: string | null;
    userAgent: string | null;
    role: CanonicalAuthRole;
    userId: number;
    requestId?: string;
  }
): void {
  const drift = computeSessionDrift(
    {
      clientId: refreshSession.client_id ?? null,
      ipSubnet: refreshSession.ip_subnet ?? null,
      userAgent: refreshSession.user_agent ?? null,
    },
    {
      clientId: current.clientId,
      ipSubnet: current.ipSubnet,
      userAgent: current.userAgent,
    }
  );
  logSessionAnomalySignal('REFRESH_SESSION_ANOMALY_SIGNAL', drift, {
    familyId: refreshSession.family_id,
    endpoint: 'auth.refresh',
    role: current.role,
    userId: current.userId,
    requestId: current.requestId,
    adminSensitive: requiresAdminTwoFactor(current.role),
  });
}

export function logAdminEndpointAnomalySignal(
  endpoint: string,
  reference: { clientId?: string | null; ipSubnet?: string | null; userAgent?: string | null },
  current: {
    clientId: string;
    ipSubnet: string | null;
    userAgent: string | null;
    userId: number;
    requestId?: string;
  }
): void {
  const drift = computeSessionDrift(reference, {
    clientId: current.clientId,
    ipSubnet: current.ipSubnet,
    userAgent: current.userAgent,
  });
  logSessionAnomalySignal('ADMIN_ENDPOINT_ANOMALY_SIGNAL', drift, {
    endpoint,
    role: 'system_admin',
    userId: current.userId,
    requestId: current.requestId,
    adminSensitive: true,
  });
}
