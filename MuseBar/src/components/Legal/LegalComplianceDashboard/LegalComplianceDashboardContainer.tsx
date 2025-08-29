/**
 * Legal Compliance Dashboard Container Component
 * Main orchestrator for the modular compliance system
 */

import React from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Gavel,
} from '@mui/icons-material';
import { ComplianceOverview } from './ComplianceOverview';
import { ComplianceAlerts } from './ComplianceAlerts';
import { ComplianceReports } from './ComplianceReports';
import { useCompliance } from './useCompliance';

/**
 * Legal Compliance Dashboard Container Component
 */
export const LegalComplianceDashboardContainer: React.FC = () => {
  const { state, actions, utils } = useCompliance();

  // Handle loading state
  if (state.loading && !state.complianceStatus) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Handle error state
  if (state.error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            Erreur de chargement
          </Typography>
          {state.error}
        </Alert>
      </Box>
    );
  }

  // Handle missing data
  if (!state.complianceStatus) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Impossible de charger les données de conformité
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Gavel />
        Conformité Légale Française
      </Typography>

      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Article 286-I-3 bis du CGI - Système de caisse sécurisé
      </Typography>

      {/* Compliance Overview */}
      <ComplianceOverview
        complianceStatus={state.complianceStatus}
        onViewJournal={actions.showJournalDialog}
        onViewClosures={actions.showClosuresDialog}
        loading={state.loading}
      />

      {/* Compliance Alerts */}
      <ComplianceAlerts
        complianceStatus={state.complianceStatus}
        loading={state.loading}
      />

      {/* Compliance Reports Dialogs */}
      <ComplianceReports
        journalEntries={state.journalEntries}
        closureBulletins={state.closureBulletins}
        showJournalDialog={state.showJournalDialog}
        showClosuresDialog={state.showClosuresDialog}
        onCloseJournalDialog={actions.hideJournalDialog}
        onCloseClosuresDialog={actions.hideClosuresDialog}
        loading={state.loading}
      />

      {/* Footer */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          <strong>Référence légale:</strong> {state.complianceStatus.legal_reference} |
          <strong> Dernière vérification:</strong> {utils.formatDate(state.complianceStatus.checked_at)}
        </Typography>
      </Box>
    </Box>
  );
};

export default LegalComplianceDashboardContainer;

