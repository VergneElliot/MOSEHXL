import { useCallback, useMemo } from 'react';
import { ApiService } from '../services/apiService';
import { ClosureBulletin } from './useClosureState';
import type { ClosureTodayStatus, LiveMonthlyStats } from '../types/api';
import { logger } from '../utils/logger';

export interface ClosureAPIActions {
  loadBulletins: (pagination?: { limit: number; offset: number; type?: CreateClosureData['type'] }) => Promise<void>;
  loadTodayStatus: () => Promise<void>;
  loadClosureSettings: () => Promise<void>;
  loadMonthlyStats: () => Promise<void>;
  createClosure: (closureData: CreateClosureData) => Promise<void>;
  updateClosureSettings: (settings: Record<string, string>) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

export interface CreateClosureData {
  date: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
  force?: boolean;
  fond_de_caisse: number;
  email_recipients?: string[];
  /** DAILY only: close_now = last closure → now; business_day = cut-time window for date */
  mode?: 'business_day' | 'close_now';
}

export const useClosureAPI = (
  setBulletins: (bulletins: ClosureBulletin[]) => void,
  setTotalBulletins: (total: number) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setCreating: (creating: boolean) => void,
  setTodayStatus: (status: ClosureTodayStatus | null) => void,
  setClosureSettings: (settings: Record<string, string>) => void,
  setMonthlyStats: (stats: LiveMonthlyStats | null) => void,
  setMonthlyStatsError: (error: string | null) => void,
  addBulletin: (bulletin: ClosureBulletin) => void,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  setShowCreateDialog: (show: boolean) => void,
  setSelectedDate: (date: string) => void
): ClosureAPIActions => {
  const apiService = useMemo(() => ApiService.getInstance(), []);

  const loadBulletins = useCallback(async (pagination?: { limit: number; offset: number; type?: CreateClosureData['type'] }) => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams();
      if (pagination?.limit != null) query.set('limit', String(pagination.limit));
      if (pagination?.offset != null) query.set('offset', String(pagination.offset));
      if (pagination?.type) query.set('type', pagination.type);

      const endpoint = `/legal/closure/bulletins${query.toString() ? `?${query.toString()}` : ''}`;

      const { data } = await apiService.get<{ bulletins: ClosureBulletin[]; total?: number }>(endpoint);
      const bulletins = Array.isArray(data?.bulletins) ? data.bulletins : [];
      setBulletins(bulletins);
      setTotalBulletins(typeof data?.total === 'number' ? data.total : bulletins.length);
    } catch (err) {
      const errorMessage = 'Erreur lors du chargement des bulletins de clôture';
      setError(errorMessage);
      logger.error('Error loading closure bulletins:', err);
    } finally {
      setLoading(false);
    }
  }, [setBulletins, setLoading, setError, setTotalBulletins, apiService]);

  const loadTodayStatus = useCallback(async () => {
    try {
      const { data } = await apiService.get<ClosureTodayStatus>('/legal/closure/today-status');
      setTodayStatus(data ?? null);
    } catch (err) {
      logger.error('Error loading today status:', err);
    }
  }, [setTodayStatus, apiService]);

  const loadClosureSettings = useCallback(async () => {
    try {
      const { data } = await apiService.get<{
        settings?: {
          auto_closure_enabled: boolean;
          daily_closure_time: string;
          timezone: string;
          grace_period_minutes: number;
        };
        auto_closure_enabled?: string;
        daily_closure_time?: string;
        timezone?: string;
        grace_period_minutes?: string;
        closure_grace_period_minutes?: string;
      }>('/legal/closure-settings');

      if (data?.settings) {
        setClosureSettings({
          auto_closure_enabled: String(data.settings.auto_closure_enabled),
          daily_closure_time: data.settings.daily_closure_time,
          timezone: data.settings.timezone,
          grace_period_minutes: String(data.settings.grace_period_minutes),
          closure_grace_period_minutes: String(data.settings.grace_period_minutes),
        });
        return;
      }

      setClosureSettings({
        auto_closure_enabled: data?.auto_closure_enabled ?? '',
        daily_closure_time: data?.daily_closure_time ?? '',
        timezone: data?.timezone ?? '',
        grace_period_minutes: data?.grace_period_minutes ?? data?.closure_grace_period_minutes ?? '',
      });
    } catch (err) {
      logger.error('Error loading closure settings:', err);
    }
  }, [setClosureSettings, apiService]);

  const loadMonthlyStats = useCallback(async () => {
    try {
      setMonthlyStatsError(null);
      const stats = await apiService.getLiveMonthlyStats();
      setMonthlyStats(stats);
    } catch (err) {
      setMonthlyStats(null);
      setMonthlyStatsError('Impossible de charger les statistiques mensuelles en direct.');
    }
  }, [apiService, setMonthlyStats, setMonthlyStatsError]);

  const createClosure = useCallback(
    async (closureData: CreateClosureData) => {
      try {
        setCreating(true);
        setError(null);
        const { data: result } = await apiService.post<{ closure?: ClosureBulletin }>(
          '/legal/closure/create',
          {
          date: closureData.date,
          type: closureData.type,
          force: closureData.force === true,
          fond_de_caisse: closureData.fond_de_caisse,
          ...(closureData.email_recipients && closureData.email_recipients.length > 0
            ? { email_recipients: closureData.email_recipients }
            : {}),
          ...(closureData.type === 'DAILY' && closureData.mode
            ? { mode: closureData.mode }
            : {}),
        }
        );
        addBulletin(result.closure ?? (result as unknown as ClosureBulletin));
        setShowCreateDialog(false);
        setSelectedDate(new Date().toISOString().split('T')[0] ?? '');
        showSuccess('Bulletin de clôture créé avec succès');

        // Refresh today status
        loadTodayStatus();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        showError(errorMessage);
      } finally {
        setCreating(false);
      }
    },
    [
      setCreating,
      setError,
      addBulletin,
      setShowCreateDialog,
      setSelectedDate,
      showSuccess,
      showError,
      loadTodayStatus,
      apiService,
    ]
  );

  const updateClosureSettings = useCallback(
    async (newSettings: Record<string, string>) => {
      try {
        const { data: updated } = await apiService.put<{
          settings?: {
            auto_closure_enabled: boolean;
            daily_closure_time: string;
            timezone: string;
            grace_period_minutes: number;
          };
          auto_closure_enabled?: string;
          daily_closure_time?: string;
          timezone?: string;
          grace_period_minutes?: string;
          closure_grace_period_minutes?: string;
        }>('/legal/closure-settings', {
          settings: newSettings,
          updated_by: 'UI',
        });

        if (updated?.settings) {
          setClosureSettings({
            auto_closure_enabled: String(updated.settings.auto_closure_enabled),
            daily_closure_time: updated.settings.daily_closure_time,
            timezone: updated.settings.timezone,
            grace_period_minutes: String(updated.settings.grace_period_minutes),
            closure_grace_period_minutes: String(updated.settings.grace_period_minutes),
          });
        } else {
          setClosureSettings({
            auto_closure_enabled: updated?.auto_closure_enabled ?? '',
            daily_closure_time: updated?.daily_closure_time ?? '',
            timezone: updated?.timezone ?? '',
            grace_period_minutes:
              updated?.grace_period_minutes ?? updated?.closure_grace_period_minutes ?? '',
          });
        }
        showSuccess('Paramètres de clôture mis à jour avec succès');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erreur lors de la mise à jour des paramètres';
        showError(errorMessage);
      }
    },
    [apiService, setClosureSettings, showSuccess, showError]
  );

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      loadTodayStatus(),
      loadClosureSettings(),
      loadMonthlyStats(),
    ]);
  }, [loadTodayStatus, loadClosureSettings, loadMonthlyStats]);

  return useMemo(
    () => ({
      loadBulletins,
      loadTodayStatus,
      loadClosureSettings,
      loadMonthlyStats,
      createClosure,
      updateClosureSettings,
      refreshAllData,
    }),
    [
      loadBulletins,
      loadTodayStatus,
      loadClosureSettings,
      loadMonthlyStats,
      createClosure,
      updateClosureSettings,
      refreshAllData,
    ]
  );
};
