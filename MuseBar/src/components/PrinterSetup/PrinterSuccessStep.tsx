import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { BridgeEnvSnippet } from './BridgeEnvSnippet';
import type { PrintingConfig } from './printerSetupProviders';

interface PrinterSuccessStepProps {
  selectedProvider: string;
  currentConfig: PrintingConfig | null;
  onClose?: () => void;
}

export const PrinterSuccessStep: React.FC<PrinterSuccessStepProps> = ({
  selectedProvider,
  currentConfig,
  onClose,
}) => (
  <Box textAlign="center" py={4}>
    <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
    <Typography variant="h5" gutterBottom>
      Configuration Saved!
    </Typography>
    <Typography variant="body1" color="text.secondary" mb={3}>
      Your printing configuration has been saved successfully.
    </Typography>
    <Box textAlign="left">
      <BridgeEnvSnippet selectedProvider={selectedProvider} currentConfig={currentConfig} />
    </Box>
    {onClose && (
      <Button variant="contained" onClick={onClose}>
        Close
      </Button>
    )}
  </Box>
);
