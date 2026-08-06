import { useCallback, useEffect, useState } from 'react';
import { apiCore } from '../services/api';
import type { SecurityLogFilters, SystemSecurityLog } from '../types/system';

interface SystemSecurityLogsResponse {
  logs: SystemSecurityLog[];
  total: number;
}

export function useSystemSecurityLogs(filters: SecurityLogFilters) {
  const [logs, setLogs] = useState<SystemSecurityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      params.set('offset', '0');
      if (filters.userId.trim()) params.set('user_id', filters.userId.trim());
      if (filters.dateRange.start) params.set('start', filters.dateRange.start);
      if (filters.dateRange.end) params.set('end', filters.dateRange.end);
      if (filters.actionType.length > 0) params.set('action_type', filters.actionType.join(','));

      const data = await apiCore.request<SystemSecurityLogsResponse>(
        `/auth/system-security-logs?${params.toString()}`,
        { method: 'GET' }
      );

      let nextLogs = Array.isArray(data?.logs) ? data.logs : [];
      if (filters.severity.length > 0) {
        nextLogs = nextLogs.filter((log) => filters.severity.includes(log.severity));
      }

      setLogs(nextLogs);
      setTotal(
        filters.severity.length > 0
          ? nextLogs.length
          : typeof data?.total === 'number'
            ? data.total
            : nextLogs.length
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le journal de sécurité');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { logs, total, loading, error, refresh };
}
