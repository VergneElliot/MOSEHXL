import { useCallback } from 'react';
import { ApiService } from '../services/apiService';
import { apiConfig } from '../config/api';
import { ClosureBulletin } from './useClosureState';

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
  setTodayStatus: (status: any) => void,
  setClosureSettings: (settings: any) => void,
  setMonthlyStats: (stats: any) => void,
  setMonthlyStatsError: (error: string | null) => void,
  addBulletin: (bulletin: ClosureBulletin) => void,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  setShowCreateDialog: (show: boolean) => void,
  setSelectedDate: (date: string) => void
): ClosureAPIActions => {
  const apiService = ApiService.getInstance();

  const loadBulletins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(apiConfig.getEndpoint('/api/legal/closures'));
      if (!response.ok) {
        throw new Error('Failed to load closure bulletins');
      }
      const data = await response.json();
      setBulletins(data || []);
    } catch (err) {
      const errorMessage = 'Erreur lors du chargement des bulletins de clôture';
      setError(errorMessage);
      console.error('Error loading closure bulletins:', err);
    } finally {
      setLoading(false);
    }
  }, [setBulletins, setLoading, setError]);

  const loadTodayStatus = useCallback(async () => {
    try {
      const response = await fetch(apiConfig.getEndpoint('/api/legal/closure/today-status'));
      if (response.ok) {
        const data = await response.json();
        setTodayStatus(data);
      }
    } catch (err) {
      console.error('Error loading today status:', err);
    }
  }, [setTodayStatus]);

  const loadClosureSettings = useCallback(async () => {
    try {
      const response = await fetch(apiConfig.getEndpoint('/api/legal/closure-settings'));
      if (response.ok) {
        const data = await response.json();
        setClosureSettings(data);
      }
    } catch (err) {
      console.error('Error loading closure settings:', err);
    }
  }, [setClosureSettings]);

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

  const createClosure = useCallback(async (closureData: CreateClosureData) => {
    try {
      setCreating(true);
      setError(null);
      
      const response = await fetch(apiConfig.getEndpoint('/api/legal/closure/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: closureData.date, 
          type: closureData.type 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create closure');
      }
      
      const result = await response.json();
      addBulletin(result.closure);
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
  }, [
    setCreating, 
    setError, 
    addBulletin, 
    setShowCreateDialog, 
    setSelectedDate, 
    showSuccess, 
    showError, 
    loadTodayStatus
  ]);

  const updateClosureSettings = useCallback(async (newSettings: any) => {
    try {
      const response = await fetch(apiConfig.getEndpoint('/api/legal/closure-settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update closure settings');
      }
      
      const updatedSettings = await response.json();
      setClosureSettings(updatedSettings);
      showSuccess('Paramètres de clôture mis à jour avec succès');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour des paramètres';
      showError(errorMessage);
    }
  }, [setClosureSettings, showSuccess, showError]);

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