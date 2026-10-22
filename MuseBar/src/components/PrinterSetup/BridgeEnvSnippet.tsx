import React from 'react';
import { Paper, TextField, Typography } from '@mui/material';
import type { PrintingConfig } from './printerSetupProviders';

interface BridgeEnvSnippetProps {
  selectedProvider: string;
  currentConfig: PrintingConfig | null;
}

export const BridgeEnvSnippet: React.FC<BridgeEnvSnippetProps> = ({
  selectedProvider,
  currentConfig,
}) => {
  if (selectedProvider !== 'bridge' || !currentConfig?.bridge_env) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Local bridge .env
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Copy this into <code>MuseBar/bridge/.env</code> on the cashier PC, then update
        <code> PRINTER_HOST</code> if the printer IP changed.
      </Typography>
      <TextField
        fullWidth
        multiline
        minRows={7}
        value={currentConfig.bridge_env}
        InputProps={{ readOnly: true }}
      />
    </Paper>
  );
};
