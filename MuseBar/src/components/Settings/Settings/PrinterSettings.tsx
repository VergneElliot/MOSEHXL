/**
 * Printer Settings Component
 * Handles thermal printer configuration and testing
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Box,
  Alert,
} from '@mui/material';
import {
  Print as PrintIcon,
  CheckCircle as CheckIcon,
  PlayArrow as TestIcon,
} from '@mui/icons-material';

interface PrinterSettingsProps {
  onTestPrinter: () => Promise<void>;
  onCheckStatus: () => Promise<void>;
}

/**
 * Printer Settings Component
 */
export const PrinterSettings: React.FC<PrinterSettingsProps> = ({
  onTestPrinter,
  onCheckStatus,
}) => {
  const handleTestPrinter = async () => {
    try {
      await onTestPrinter();
      alert("✅ Test d'impression réussi! Vérifiez l'imprimante.");
    } catch (error) {
      alert(`❌ Échec du test: ${error}`);
    }
  };

  const handleCheckStatus = async () => {
    try {
      await onCheckStatus();
      alert("✅ Imprimante disponible et opérationnelle");
    } catch (error) {
      alert(`❌ Imprimante non disponible: ${error}`);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <PrintIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Configuration Imprimante
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Printer Information */}
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Imprimante configurée:</strong> Oxhoo TP85v Network
              </Typography>
              <Typography variant="body2">
                Imprimante thermique pour les reçus et tickets de caisse.
                Utilisez les boutons ci-dessous pour tester la connectivité et l'impression.
              </Typography>
            </Alert>
          </Grid>

          {/* Printer Status */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Vérification du Statut
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Vérifiez si l'imprimante est connectée et prête à imprimer.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<CheckIcon />}
                  onClick={handleCheckStatus}
                  fullWidth
                >
                  Vérifier le Statut
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Printer Test */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Test d'Impression
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Imprimez une page de test pour vérifier le bon fonctionnement.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<TestIcon />}
                  onClick={handleTestPrinter}
                  fullWidth
                >
                  Test d'Impression
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Printer Configuration Info */}
          <Grid item xs={12}>
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Configuration requise:
              </Typography>
              <Typography variant="body2">
                • L'imprimante doit être connectée au réseau local<br />
                • Assurez-vous que l'imprimante est allumée et opérationnelle<br />
                • Vérifiez que du papier thermique est disponible<br />
                • L'impression automatique des reçus est requise pour la conformité légale
              </Typography>
            </Alert>
          </Grid>

          {/* Technical Specifications */}
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Spécifications Techniques
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Modèle:</strong> Oxhoo TP85v Network
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Type:</strong> Imprimante thermique
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Connectivité:</strong> Réseau Ethernet/WiFi
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Format papier:</strong> 80mm thermique
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Vitesse:</strong> 300mm/s
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Résolution:</strong> 203 DPI
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default PrinterSettings;

