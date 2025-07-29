import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';

interface ComplianceStatus {
  compliance_status: {
    journal_integrity: string;
    integrity_errors: string[];
    last_closure: string | null;
    certification_required_by: string;
    certification_bodies: string[];
    fine_risk: string;
  };
  journal_statistics: {
    total_entries: number;
    sale_transactions: number;
    first_entry: string | null;
    last_entry: string | null;
  };
  isca_pillars: {
    inaltérabilité: string;
    sécurisation: string;
    conservation: string;
    archivage: string;
  };
  legal_reference: string;
  checked_at: string;
}

interface JournalEntry {
  id: number;
  sequence_number: number;
  transaction_type: string;
  amount: number;
  timestamp: string;
  hash: string;
  previous_hash: string;
  order_id?: number;
  vat_amount?: number;
  payment_method?: string;
}

interface ClosureBulletin {
  id: number;
  closure_type: string;
  closure_date: string;
  total_transactions: number;
  total_amount: number;
  hash: string;
  period_start?: string;
  period_end?: string;
  total_vat?: number;
  is_closed?: boolean;
}

interface LegalComplianceState {
  loading: boolean;
  error: string | null;
  complianceStatus: ComplianceStatus | null;
  journalEntries: JournalEntry[];
  closureBulletins: ClosureBulletin[];
  showJournalDialog: boolean;
  showClosuresDialog: boolean;
}

interface LegalComplianceActions {
  loadComplianceData: () => Promise<void>;
  loadJournalEntries: () => Promise<void>;
  loadClosureBulletins: () => Promise<void>;
  setShowJournalDialog: (show: boolean) => void;
  setShowClosuresDialog: (show: boolean) => void;
}

export const useLegalCompliance = (): [LegalComplianceState, LegalComplianceActions] => {
  const [state, setState] = useState<LegalComplianceState>({
    loading: false,
    error: null,
    complianceStatus: null,
    journalEntries: [],
    closureBulletins: [],
    showJournalDialog: false,
    showClosuresDialog: false,
  });

  // Auto-load compliance data on component mount
  useEffect(() => {
    loadComplianceData();
  }, []); // Empty dependency array to run only on mount

  const loadComplianceData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await apiService.get('/api/legal/compliance/status');
      setState(prev => ({
        ...prev,
        complianceStatus: response.data as ComplianceStatus,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error:
          error instanceof Error
            ? error.message
            : 'Erreur lors du chargement des données de conformité',
        loading: false,
      }));
    }
  }, []);

  const loadJournalEntries = useCallback(async () => {
    try {
      const response = await apiService.get('/api/legal/journal/entries');
      setState(prev => ({
        ...prev,
        journalEntries: (response.data as JournalEntry[]) || [],
      }));
    } catch (error) {
      // Silent error handling - errors are handled by the UI layer
    }
  }, []);

  const loadClosureBulletins = useCallback(async () => {
    try {
      const response = await apiService.get('/api/legal/closures/bulletins');
      setState(prev => ({
        ...prev,
        closureBulletins: (response.data as ClosureBulletin[]) || [],
      }));
    } catch (error) {
      // Silent error handling - errors are handled by the UI layer
    }
  }, []);

  const setShowJournalDialog = useCallback(
    (show: boolean) => {
      setState(prev => ({ ...prev, showJournalDialog: show }));
      if (show && state.journalEntries.length === 0) {
        loadJournalEntries();
      }
    },
    [state.journalEntries.length, loadJournalEntries]
  );

  const setShowClosuresDialog = useCallback(
    (show: boolean) => {
      setState(prev => ({ ...prev, showClosuresDialog: show }));
      if (show && state.closureBulletins.length === 0) {
        loadClosureBulletins();
      }
    },
    [state.closureBulletins.length, loadClosureBulletins]
  );

  // Load initial compliance data
  useEffect(() => {
    loadComplianceData();
  }, [loadComplianceData]);

  const actions: LegalComplianceActions = {
    loadComplianceData,
    loadJournalEntries,
    loadClosureBulletins,
    setShowJournalDialog,
    setShowClosuresDialog,
  };

  return [state, actions];
};

export const useLegalComplianceUtils = () => {
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  }, []);

  const getIntegrityStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'VALID':
        return 'success';
      case 'COMPROMISED':
        return 'error';
      default:
        return 'warning';
    }
  }, []);

  return {
    formatDate,
    getIntegrityStatusColor,
  };
};
