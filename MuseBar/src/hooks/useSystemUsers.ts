import { useCallback, useEffect, useState } from 'react';
import { apiCore } from '../services/api';
import type { SystemUser } from '../types/system';

export function useSystemUsers() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCore.request<SystemUser[]>('/auth/system-users', { method: 'GET' });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les utilisateurs système');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createUser = useCallback(
    async (input: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
    }) => {
      await apiCore.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          first_name: input.first_name,
          last_name: input.last_name,
        }),
      });
      await refresh();
    },
    [refresh]
  );

  const setActive = useCallback(
    async (userId: number, isActive: boolean) => {
      await apiCore.request(`/auth/system-users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
      });
      await refresh();
    },
    [refresh]
  );

  return { users, loading, error, refresh, createUser, setActive };
}
