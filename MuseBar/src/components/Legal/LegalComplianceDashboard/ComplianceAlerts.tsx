/**
 * Compliance Alerts Component
 * Displays alert system for compliance issues
 */

import React from 'react';
import {
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import {
  Error,
  Warning,
  Info,
  CheckCircle,
} from '@mui/icons-material';
import { ComplianceAlertsProps } from './types';

/**
 * Compliance Alerts Component
 */
export const ComplianceAlerts: React.FC<ComplianceAlertsProps> = ({
  complianceStatus,
  loading = false,
}) => {
  const hasErrors = complianceStatus.compliance_status.integrity_errors.length > 0;
  const isCertified = complianceStatus.compliance_status.is_certified;
  const journalIntegrity = complianceStatus.compliance_status.journal_integrity;

  // Don't render if loading
  if (loading) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* Integrity Errors */}
      {hasErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>Erreurs d'Intégrité Détectées</AlertTitle>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Des erreurs d'intégrité ont été détectées dans le journal légal. 
            Ces erreurs doivent être corrigées immédiatement pour maintenir la conformité.
          </Typography>
          
          <List dense>
            {complianceStatus.compliance_status.integrity_errors.map((error, index) => (
              <ListItem key={index} sx={{ pl: 0 }}>
                <ListItemIcon>
                  <Error color="error" fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary={error}
                  primaryTypographyProps={{ 
                    variant: 'body2',
                    color: 'error.main'
                  }}
                />
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Actions recommandées:
            </Typography>
            <Typography variant="body2">
              1. Contactez immédiatement votre prestataire technique<br />
              2. Arrêtez toute nouvelle transaction jusqu'à résolution<br />
              3. Documentez l'incident pour l'audit
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Certification Status */}
      {!isCertified && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Certification NF 525 Requise</AlertTitle>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Votre système de caisse doit être certifié NF 525 avant le{' '}
            <strong>{complianceStatus.compliance_status.certification_required_by}</strong>
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Étapes de certification:
            </Typography>
            <Typography variant="body2">
              1. Audit technique du système<br />
              2. Vérification de la conformité légale<br />
              3. Délivrance du certificat NF 525<br />
              4. Mise à jour du statut dans le système
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Journal Integrity Status */}
      {journalIntegrity.toLowerCase() === 'avertissement' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Avertissement Intégrité Journal</AlertTitle>
          <Typography variant="body2">
            Des problèmes mineurs ont été détectés dans l'intégrité du journal. 
            Bien que le système reste fonctionnel, une vérification est recommandée.
          </Typography>
        </Alert>
      )}

      {/* Success State */}
      {!hasErrors && isCertified && journalIntegrity.toLowerCase() === 'valide' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <AlertTitle>Système Conforme</AlertTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <CheckCircle color="success" />
            <Box>
              <Typography variant="body2">
                Votre système de caisse est entièrement conforme aux exigences légales françaises.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip 
                  label="NF 525 Certifié" 
                  size="small" 
                  color="success" 
                  variant="outlined" 
                />
                <Chip 
                  label="Journal Intègre" 
                  size="small" 
                  color="success" 
                  variant="outlined" 
                />
                <Chip 
                  label="Conformité CGI" 
                  size="small" 
                  color="success" 
                  variant="outlined" 
                />
              </Box>
            </Box>
          </Box>
        </Alert>
      )}

      {/* Information Alert */}
      <Alert severity="info">
        <AlertTitle>Conformité Légale Française</AlertTitle>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Ce tableau de bord surveille la conformité de votre système de caisse aux exigences de l'article 286-I-3 bis du CGI.
        </Typography>
        
        <Typography variant="body2">
          <strong>Obligations légales:</strong><br />
          • Journal des transactions inaltérable et sécurisé<br />
          • Certification NF 525 obligatoire<br />
          • Conservation des données pendant 6 ans<br />
          • Archivage conforme aux standards ISCA
        </Typography>
      </Alert>
    </Box>
  );
};

export default ComplianceAlerts;

