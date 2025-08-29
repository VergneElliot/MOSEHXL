/**
 * Legal Compliance Dashboard Types and Interfaces
 * Centralized type definitions for the compliance system
 */

export interface ComplianceStatus {
  compliance_status: {
    journal_integrity: string;
    certification_required_by: string;
    is_certified: boolean;
    integrity_errors: string[];
  };
  journal_statistics: {
    total_entries: number;
    total_transactions: number;
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

export interface JournalEntry {
  id: string;
  sequence_number: number;
  entry_type: string;
  order_id: string;
  total_amount: number;
  total_vat: number;
  payment_method: string;
  created_at: string;
  hash: string;
}

export interface ClosureBulletin {
  id: string;
  closure_type: string;
  period_start: string | null;
  period_end: string | null;
  total_transactions: number;
  total_amount: number;
  total_vat: number | null;
  is_closed: boolean;
  created_at: string;
}

export interface ComplianceState {
  loading: boolean;
  error: string | null;
  complianceStatus: ComplianceStatus | null;
  journalEntries: JournalEntry[];
  closureBulletins: ClosureBulletin[];
  showJournalDialog: boolean;
  showClosuresDialog: boolean;
}

export interface ComplianceOverviewProps {
  complianceStatus: ComplianceStatus;
  onViewJournal: () => void;
  onViewClosures: () => void;
  loading?: boolean;
}

export interface ComplianceAlertsProps {
  complianceStatus: ComplianceStatus;
  loading?: boolean;
}

export interface ComplianceReportsProps {
  journalEntries: JournalEntry[];
  closureBulletins: ClosureBulletin[];
  showJournalDialog: boolean;
  showClosuresDialog: boolean;
  onCloseJournalDialog: () => void;
  onCloseClosuresDialog: () => void;
  loading?: boolean;
}

export interface UseComplianceReturn {
  state: ComplianceState;
  actions: {
    loadComplianceData: () => Promise<void>;
    loadJournalEntries: () => Promise<void>;
    loadClosureBulletins: () => Promise<void>;
    showJournalDialog: () => void;
    hideJournalDialog: () => void;
    showClosuresDialog: () => void;
    hideClosuresDialog: () => void;
    refreshCompliance: () => Promise<void>;
  };
  utils: {
    formatDate: (date: string) => string;
    formatCurrency: (amount: number) => string;
    getIntegrityStatusColor: (status: string) => string;
    getIntegrityStatusIcon: (status: string) => React.ReactElement;
  };
}

export interface ComplianceMetrics {
  totalEntries: number;
  totalTransactions: number;
  integrityStatus: string;
  certificationStatus: boolean;
  errorCount: number;
}

export interface CompliancePillar {
  name: string;
  status: string;
  icon: React.ReactElement;
  description: string;
}

