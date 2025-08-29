/**
 * Happy Hour Status Component
 * Displays current status and manual controls
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { HappyHourStatusProps } from './types';

/**
 * Happy Hour Status Component
 */
export const HappyHourStatus: React.FC<HappyHourStatusProps> = ({
  isActive,
  timeUntil,
  settings,
  onManualToggle,
  loading = false,
}) => {
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusMessage = () => {
    if (isActive) {
      return `Happy Hour actif jusqu'à ${settings.endTime}`;
    } else if (timeUntil && timeUntil !== 'Inactif') {
      return `Prochaine session dans ${timeUntil}`;
    } else {
      return 'Happy Hour désactivé';
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Statut actuel
        </Typography>

        {/* Status Display */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {isActive ? (
            <Chip
              icon={<CheckIcon />}
              label="HAPPY HOUR ACTIF"
              color="success"
              variant="filled"
              sx={{ fontWeight: 'bold' }}
            />
          ) : (
            <Chip
              icon={<CancelIcon />}
              label="Happy Hour inactif"
              color="default"
              variant="outlined"
            />
          )}
        </Box>

        {/* Current Time */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <ScheduleIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
            Heure actuelle: {getCurrentTime()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {getStatusMessage()}
          </Typography>
        </Box>

        {/* Schedule Information */}
        {settings.isEnabled && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Horaires configurés:</strong> {settings.startTime} - {settings.endTime}
              <br />
              <strong>Réduction par défaut:</strong>{' '}
              {settings.discountType === 'percentage'
                ? `${settings.discountValue}%`
                : `${settings.discountValue}€`}
            </Typography>
          </Alert>
        )}

        {/* Manual Control */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Contrôle manuel
          </Typography>
          
          <Button
            variant={isActive ? "outlined" : "contained"}
            color={isActive ? "error" : "success"}
            startIcon={
              loading ? (
                <CircularProgress size={16} />
              ) : isActive ? (
                <StopIcon />
              ) : (
                <PlayIcon />
              )
            }
            onClick={onManualToggle}
            disabled={loading}
            fullWidth
          >
            {loading
              ? 'Traitement...'
              : isActive
              ? 'Désactiver manuellement'
              : 'Activer manuellement'}
          </Button>
          
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            {isActive
              ? 'Désactive temporairement l\'Happy Hour'
              : 'Active l\'Happy Hour indépendamment des horaires'}
          </Typography>
        </Box>

        {/* Settings Status */}
        {!settings.isEnabled && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Attention:</strong> L'Happy Hour automatique est désactivé.
              <br />
              Activez-le dans la configuration pour qu'il fonctionne selon les horaires.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default HappyHourStatus;

