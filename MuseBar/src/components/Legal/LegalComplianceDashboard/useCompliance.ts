/**
 * Compliance State Management Hook
 * Centralized state management and business logic for legal compliance
 */

import { useState, useEffect, useCallback } from 'react';
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

  /**
   * Load compliance data from API
   */
  const loadComplianceData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Mock API call - replace with actual API
      const response = await fetch('/api/compliance/status');
      if (!response.ok) {
        throw new globalThis.Error('Failed to load compliance data');
      }
      
      const complianceStatus: ComplianceStatus = await response.json();
      
      setState(prev => ({
        ...prev,
        complianceStatus,
        loading: false,
      }));
    } catch (error) {
      console.error('Error loading compliance data:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof globalThis.Error ? error.message : 'Unknown error',
        loading: false,
      }));
    }
  }, []);

  /**
   * Load journal entries
   */
  const loadJournalEntries = useCallback(async () => {
    try {
      const response = await fetch('/api/legal/journal/entries');
      if (!response.ok) {
        throw new globalThis.Error('Failed to load journal entries');
      }
      
      const journalEntries: JournalEntry[] = await response.json();
      
      setState(prev => ({
        ...prev,
        journalEntries,
      }));
    } catch (error) {
      console.error('Error loading journal entries:', error);
    }
  }, []);

  /**
   * Load closure bulletins
   */
  const loadClosureBulletins = useCallback(async () => {
    try {
      const response = await fetch('/api/legal/closures');
      if (!response.ok) {
        throw new globalThis.Error('Failed to load closure bulletins');
      }
      
      const closureBulletins: ClosureBulletin[] = await response.json();
      
      setState(prev => ({
        ...prev,
        closureBulletins,
      }));
    } catch (error) {
      console.error('Error loading closure bulletins:', error);
    }
  }, []);

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
  const formatDate = useCallback((date: string): string => {
    if (!date) return 'N/A';
    
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Date invalide';
    }
  }, []);

  /**
   * Format currency amount
   */
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }, []);

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

