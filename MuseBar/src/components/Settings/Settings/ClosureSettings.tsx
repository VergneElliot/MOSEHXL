import { logger } from '../../../utils/logger';
/**
 * Closure Settings Component
 * Handles automatic closure configuration and scheduler management
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  MenuItem,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Save as SaveIcon,
  PlayArrow as TriggerIcon,
} from '@mui/icons-material';
import { ClosureSettingsProps } from './types';

/**
 * Timezone options
 */
const TIMEZONE_OPTIONS = [
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
];

/**
 * Closure Settings Component
 */
export const ClosureSettings: React.FC<ClosureSettingsProps> = ({
  closureSettings,
  schedulerStatus,
  onUpdate,
  onSave,
  onTriggerManualCheck,
  loading = false,
}) => {
  const handleFieldChange = (field: keyof typeof closureSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox' 
      ? event.target.checked 
      : event.target.type === 'number' 
        ? parseInt(event.target.value) || 0
        : event.target.value;

    onUpdate({
      ...closureSettings,
      [field]: value,
    });
  };

  const handleSave = async () => {
    try {
      await onSave();
    } catch (error) {
      logger.error('Error saving closure settings:', error);
    }
  };

  const handleTriggerCheck = async () => {
    try {
      await onTriggerManualCheck();
    } catch (error) {
      logger.error('Error triggering manual check:', error);
    }
  };

  const getSchedulerStatusColor = () => {
    if (schedulerStatus.is_running && schedulerStatus.has_interval) {
      return 'success';
    } else if (schedulerStatus.is_running) {
      return 'warning';
    } else {
      return 'error';
    }
  };

  const getSchedulerStatusText = () => {
    if (schedulerStatus.is_running && schedulerStatus.has_interval) {
      return 'Actif';
    } else if (schedulerStatus.is_running) {
      return 'En cours';
    } else {
      return 'Inactif';
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Clôture Automatique
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Scheduler Status */}
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Statut du Planificateur:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <Chip
                  label={getSchedulerStatusText()}
                  color={getSchedulerStatusColor()}
                  size="small"
                />
                <Typography variant="body2">
                  Prochaine vérification: {schedulerStatus.next_check}
                </Typography>
              </Box>
            </Alert>
          </Grid>

          {/* Auto Closure Enable/Disable */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={closureSettings.auto_closure_enabled}
                  onChange={handleFieldChange('auto_closure_enabled')}
                  disabled={loading}
                />
              }
              label="Activer la clôture automatique"
            />
            {closureSettings.auto_closure_enabled && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Après activation, sauvegardez puis lancez « Déclencher vérification manuelle »
                une fois hors service pour confirmer que le planificateur tourne sans erreur.
                Ne laissez pas l&apos;auto-clôture activée si cette vérification échoue.
              </Alert>
            )}
          </Grid>

          {/* Daily Closure Time — the business day boundary, not just a scheduler setting:
              manual "journée commerciale" closures and live day stats use it too, so it
              must stay editable when the scheduler is off. */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Heure de coupure de la journée commerciale"
              type="time"
              fullWidth
              value={closureSettings.daily_closure_time}
              onChange={handleFieldChange('daily_closure_time')}
              disabled={loading}
              helperText="Fin de journée commerciale (ex. 04:00 = la nuit compte pour la veille). Sert aussi aux clôtures manuelles."
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          {/* Timezone */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Fuseau horaire"
              select
              fullWidth
              value={closureSettings.timezone}
              onChange={handleFieldChange('timezone')}
              disabled={loading}
              helperText="Fuseau horaire des journées commerciales"
            >
              {TIMEZONE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Grace Period */}
          <Grid item xs={12} md={6}>
            <TextField
              label="Période de grâce (minutes)"
              type="number"
              fullWidth
              value={closureSettings.grace_period_minutes}
              onChange={handleFieldChange('grace_period_minutes')}
              disabled={loading || !closureSettings.auto_closure_enabled}
              inputProps={{
                min: 5,
                max: 120,
                step: 5,
              }}
              helperText="Temps d'attente après l'heure de clôture pour exécuter la clôture"
            />
          </Grid>

          {/* Accounting emails */}
          <Grid item xs={12}>
            <TextField
              label="Emails comptables (envoi automatique des bulletins)"
              fullWidth
              multiline
              minRows={2}
              value={(closureSettings.accounting_emails ?? []).join(', ')}
              onChange={(event) =>
                onUpdate({
                  ...closureSettings,
                  accounting_emails: event.target.value
                    .split(/[,;\n]+/)
                    .map((part) => part.trim())
                    .filter(Boolean),
                })
              }
              disabled={loading}
              placeholder="comptable@cabinet.fr, associe@cabinet.fr"
              helperText="Si renseigné, chaque bulletin de clôture (manuel ou automatique) est envoyé à ces adresses. Laissez vide pour désactiver l'envoi automatique. Séparez les adresses par des virgules."
            />
          </Grid>

          {/* Information Alert */}
          <Grid item xs={12}>
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Important:
              </Typography>
              <Typography variant="body2">
                • La clôture automatique génère les bulletins de clôture obligatoires<br />
                • Cette fonctionnalité est requise pour la conformité légale française<br />
                • Assurez-vous que l'heure de clôture correspond à vos horaires d'exploitation<br />
                • La période de grâce permet de finaliser les commandes en cours
              </Typography>
            </Alert>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<TriggerIcon />}
                onClick={handleTriggerCheck}
                disabled={loading}
              >
                Déclencher Vérification Manuelle
              </Button>
              
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={loading}
                size="large"
              >
                {loading ? 'Sauvegarde...' : 'Sauvegarder les Paramètres'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ClosureSettings;

