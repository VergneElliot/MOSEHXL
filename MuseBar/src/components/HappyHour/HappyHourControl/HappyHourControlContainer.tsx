/**
 * Happy Hour Control Container Component
 * Main orchestrator for the modular happy hour system
 */

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { HappyHourControlProps } from './types';
import { HappyHourStatus } from './HappyHourStatus';
import { HappyHourForm } from './HappyHourForm';
import { HappyHourSchedule } from './HappyHourSchedule';
import { useHappyHour } from './useHappyHour';

/**
 * Happy Hour Control Container Component
 */
export const HappyHourControlContainer: React.FC<HappyHourControlProps> = ({
  isActive,
  timeUntil,
  onStatusUpdate,
}) => {
  const happyHour = useHappyHour(onStatusUpdate);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Contrôle Happy Hour
      </Typography>

      <Grid container spacing={3}>
        {/* Status Section */}
        <Grid item xs={12} md={6}>
          <HappyHourStatus
            isActive={isActive}
            timeUntil={timeUntil}
            settings={happyHour.state.settings}
            onManualToggle={happyHour.toggleManualActive}
            loading={happyHour.state.loading}
          />
        </Grid>

        {/* Configuration Section */}
        <Grid item xs={12} md={6}>
          <HappyHourForm
            settings={happyHour.state.settings}
            onSettingsChange={happyHour.updateSettings}
            onSave={happyHour.saveSettings}
            loading={happyHour.state.loading}
          />
        </Grid>

        {/* Products Schedule Section */}
        <Grid item xs={12}>
          <HappyHourSchedule
            eligibleProducts={happyHour.state.eligibleProducts}
            editingProductId={happyHour.state.editingProductId}
            editForm={happyHour.state.editForm}
            onEditProduct={happyHour.startEditingProduct}
            onEditFormChange={happyHour.updateEditForm}
            onSaveProduct={happyHour.saveProductDiscount}
            onCancelEdit={happyHour.cancelEditing}
            loading={happyHour.state.loading}
          />
        </Grid>

        {/* Information Section */}
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              Comment fonctionne l'Happy Hour :
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <ScheduleIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Activation automatique"
                  secondary="L'Happy Hour s'active automatiquement selon les heures configurées"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <PlayIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Activation manuelle"
                  secondary="Vous pouvez activer/désactiver manuellement l'Happy Hour à tout moment"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Réductions personnalisées"
                  secondary="Configurez des réductions spécifiques pour chaque produit ou utilisez la réduction par défaut"
                />
              </ListItem>
            </List>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HappyHourControlContainer;

