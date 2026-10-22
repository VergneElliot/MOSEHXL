import React from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { BridgeEnvSnippet } from './BridgeEnvSnippet';
import {
  getProviderInfo,
  type Printer,
  type PrinterConfigValues,
  type PrintingConfig,
} from './printerSetupProviders';

interface PrinterReviewStepProps {
  selectedProvider: string;
  config: PrinterConfigValues;
  currentConfig: PrintingConfig | null;
  printers: Printer[];
  loading: boolean;
  onBack: () => void;
  onSave: () => void;
}

function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.includes('key') || lower.includes('password');
}

export const PrinterReviewStep: React.FC<PrinterReviewStepProps> = ({
  selectedProvider,
  config,
  currentConfig,
  printers,
  loading,
  onBack,
  onSave,
}) => {
  const providerConfig = getProviderInfo(selectedProvider);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review Configuration
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Printing Method
        </Typography>
        <Box display="flex" alignItems="center" mt={1}>
          {providerConfig?.icon}
          <Typography variant="body1" ml={1}>
            {providerConfig?.name}
          </Typography>
        </Box>
      </Paper>

      {Object.keys(config).length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Configuration
          </Typography>
          {Object.entries(config).map(([key, value]) => (
            <Box key={key} display="flex" justifyContent="space-between" mt={1}>
              <Typography variant="body2">{key}:</Typography>
              <Typography variant="body2" fontWeight="medium">
                {isSecretKey(key) ? '••••••••' : String(value)}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}

      <BridgeEnvSnippet selectedProvider={selectedProvider} currentConfig={currentConfig} />

      {printers.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Available Printers
          </Typography>
          <List dense>
            {printers.map((printer) => (
              <ListItem key={printer.id}>
                <ListItemText primary={printer.name} secondary={printer.description} />
                {printer.isDefault && <Chip label="Default" size="small" color="primary" />}
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Box mt={3} display="flex" gap={2}>
        <Button onClick={onBack}>Back</Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
        >
          Save Configuration
        </Button>
      </Box>
    </Box>
  );
};
