/**
 * Settings Container Component
 * Main orchestrator for the modular settings system
 */

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { SettingsTabs } from './SettingsTabs';
import { useSettings } from './useSettings';
import { SettingsProps } from './types';

/**
 * Settings Container Component
 */
export const SettingsContainer: React.FC<SettingsProps> = ({
  isHappyHourActive = false,
  timeUntilHappyHour = '',
  onHappyHourStatusUpdate = () => {},
  products = [],
}) => {
  const settingsHook = useSettings();

  // Loading state
  if (settingsHook.loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="400px"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" color="text.secondary">
          Chargement des paramètres...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 3 }}>
      <SettingsTabs
        settingsHook={settingsHook}
        isHappyHourActive={isHappyHourActive}
        timeUntilHappyHour={timeUntilHappyHour}
        onHappyHourStatusUpdate={onHappyHourStatusUpdate}
        products={products}
      />
    </Box>
  );
};

export default SettingsContainer;

