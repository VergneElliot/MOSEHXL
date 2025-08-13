import { useCallback, useMemo } from 'react';
import { ApiService } from '../services/apiService';
import { ClosureBulletin } from './useClosureState';
import type { ClosureTodayStatus, ClosureSettings, LiveMonthlyStats } from '../types/api';

export interface ClosureAPIActions {
  loadBulletins: () => Promise<void>;
  loadTodayStatus: () => Promise<void>;
  loadClosureSettings: () => Promise<void>;
  loadMonthlyStats: () => Promise<void>;
  createClosure: (closureData: CreateClosureData) => Promise<void>;
  updateClosureSettings: (settings: any) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

export interface CreateClosureData {
  date: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ANNUAL';
}

export const useClosureAPI = (
  setBulletins: (bulletins: ClosureBulletin[]) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setCreating: (creating: boolean) => void,
  setTodayStatus: (status: ClosureTodayStatus) => void,
  setClosureSettings: (settings: ClosureSettings) => void,
  setMonthlyStats: (stats: LiveMonthlyStats) => void,
  setMonthlyStatsError: (error: string | null) => void,
  addBulletin: (bulletin: ClosureBulletin) => void,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  setShowCreateDialog: (show: boolean) => void,
  setSelectedDate: (date: string) => void
): ClosureAPIActions => {
  const apiService = useMemo(() => ApiService.getInstance(), []);

  const loadBulletins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiService.get<ClosureBulletin[]>('/legal/closures');
      setBulletins(data || []);
    } catch (err) {
      const errorMessage = 'Erreur lors du chargement des bulletins de clôture';
      setError(errorMessage);
      console.error('Error loading closure bulletins:', err);
    } finally {
      setLoading(false);
    }
  }, [setBulletins, setLoading, setError, apiService]);

  const loadTodayStatus = useCallback(async () => {
    try {
      const { data } = await apiService.get<ClosureTodayStatus>('/legal/closure/today-status');
      setTodayStatus(data);
    } catch (err) {
      console.error('Error loading today status:', err);
    }
  }, [setTodayStatus, apiService]);

  const loadClosureSettings = useCallback(async () => {
    try {
      const { data } = await apiService.get<ClosureSettings>('/legal/closure-settings');
      setClosureSettings(data);
    } catch (err) {
      console.error('Error loading closure settings:', err);
    }
  }, [setClosureSettings, apiService]);

  const loadMonthlyStats = useCallback(async () => {
    try {
      setMonthlyStatsError(null);
      const stats = await apiService.getLiveMonthlyStats();
      setMonthlyStats(stats as LiveMonthlyStats);
    } catch (err) {
      setMonthlyStats({} as LiveMonthlyStats);
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
        }
        );
        addBulletin(result.closure ?? (result as unknown as ClosureBulletin));
        setShowCreateDialog(false);
        setSelectedDate(new Date().toISOString().split('T')[0]);
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
        const { data: updatedSettings } = await apiService.put<ClosureSettings>('/legal/closure-settings', {
          settings: newSettings,
          updated_by: 'UI',
        });
        setClosureSettings(updatedSettings);
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
      loadBulletins(),
      loadTodayStatus(),
      loadClosureSettings(),
      loadMonthlyStats(),
    ]);
  }, [loadBulletins, loadTodayStatus, loadClosureSettings, loadMonthlyStats]);

  return {
    loadBulletins,
    loadTodayStatus,
    loadClosureSettings,
    loadMonthlyStats,
    createClosure,
    updateClosureSettings,
    refreshAllData,
  };
};
