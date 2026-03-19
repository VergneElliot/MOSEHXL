/**
 * Compliance State Management Hook
 * Centralized state management and business logic for legal compliance
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import React from 'react';
import {
  CheckCircle,
  Error,
  Warning,
} from '@mui/icons-material';
import {
  ComplianceState,
  UseComplianceReturn,
  ComplianceStatus,
  JournalEntry,
  ClosureBulletin,
} from './types';
import { ApiService } from '../../../services/apiService';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate as formatDateUtil } from '../../../utils/formatDate';

/**
 * Default compliance state
 */
const defaultState: ComplianceState = {
  loading: true,
  error: null,
  complianceStatus: null,
  journalEntries: [],
  closureBulletins: [],
  showJournalDialog: false,
  showClosuresDialog: false,
};

/**
 * Compliance Hook
 */
export const useCompliance = (): UseComplianceReturn => {
  const [state, setState] = useState<ComplianceState>(defaultState);
  const apiService = useMemo(() => ApiService.getInstance(), []);

  const loadComplianceData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiService.get<ComplianceStatus>('/legal/compliance/status');
      
      setState(prev => ({
        ...prev,
        complianceStatus: response.data,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof globalThis.Error ? error.message : 'Erreur de chargement',
        loading: false,
      }));
    }
  }, [apiService]);

  const loadJournalEntries = useCallback(async () => {
    try {
      const response = await apiService.get<JournalEntry[]>('/legal/journal/entries');
      setState(prev => ({ ...prev, journalEntries: response.data }));
    } catch {
      // Journal entries are non-critical; swallow to avoid blocking UI
    }
  }, [apiService]);

  const loadClosureBulletins = useCallback(async () => {
    try {
      const response = await apiService.get<ClosureBulletin[]>('/legal/closure/bulletins');
      setState(prev => ({ ...prev, closureBulletins: response.data }));
    } catch {
      // Closures are non-critical; swallow to avoid blocking UI
    }
  }, [apiService]);

  /**
   * Show journal dialog
   */
  const showJournalDialog = useCallback(() => {
    setState(prev => ({ ...prev, showJournalDialog: true }));
    loadJournalEntries();
  }, [loadJournalEntries]);

  /**
   * Hide journal dialog
   */
  const hideJournalDialog = useCallback(() => {
    setState(prev => ({ ...prev, showJournalDialog: false }));
  }, []);

  /**
   * Show closures dialog
   */
  const showClosuresDialog = useCallback(() => {
    setState(prev => ({ ...prev, showClosuresDialog: true }));
    loadClosureBulletins();
  }, [loadClosureBulletins]);

  /**
   * Hide closures dialog
   */
  const hideClosuresDialog = useCallback(() => {
    setState(prev => ({ ...prev, showClosuresDialog: false }));
  }, []);

  /**
   * Refresh compliance data
   */
  const refreshCompliance = useCallback(async () => {
    await Promise.all([
      loadComplianceData(),
      loadJournalEntries(),
      loadClosureBulletins(),
    ]);
  }, [loadComplianceData, loadJournalEntries, loadClosureBulletins]);

  /**
   * Format date string
   */
  const formatDate = useCallback((date: string): string => formatDateUtil(date), []);

  /**
   * Get integrity status color
   */
  const getIntegrityStatusColor = useCallback((status: string): string => {
    switch (status.toLowerCase()) {
      case 'valide':
      case 'valid':
        return 'success';
      case 'erreur':
      case 'error':
        return 'error';
      case 'avertissement':
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  }, []);

  /**
   * Get integrity status icon
   */
  const getIntegrityStatusIcon = useCallback((status: string): React.ReactElement => {
    switch (status.toLowerCase()) {
      case 'valide':
      case 'valid':
        return React.createElement(CheckCircle);
      case 'erreur':
      case 'error':
        return React.createElement(Error);
      case 'avertissement':
      case 'warning':
        return React.createElement(Warning);
      default:
        return React.createElement(Warning);
    }
  }, []);

  /**
   * Initialize data on mount
   */
  useEffect(() => {
    loadComplianceData();
  }, [loadComplianceData]);

  return {
    state,
    actions: {
      loadComplianceData,
      loadJournalEntries,
      loadClosureBulletins,
      showJournalDialog,
      hideJournalDialog,
      showClosuresDialog,
      hideClosuresDialog,
      refreshCompliance,
    },
    utils: {
      formatDate,
      formatCurrency,
      getIntegrityStatusColor,
      getIntegrityStatusIcon,
    },
  };
};

