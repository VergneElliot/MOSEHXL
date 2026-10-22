import React from 'react';
import { Alert, Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import { Check as CheckIcon, Print as PrintIcon } from '@mui/icons-material';
import { BridgeEnvSnippet } from './BridgeEnvSnippet';
import {
  getProviderInfo,
  type PrinterConfigValues,
  type PrintingConfig,
} from './printerSetupProviders';

interface PrinterConfigureStepProps {
  selectedProvider: string;
  config: PrinterConfigValues;
  currentConfig: PrintingConfig | null;
  error: string | null;
  success: string | null;
  testPrintLoading: boolean;
  onFieldChange: (field: string, value: unknown) => void;
  onBack: () => void;
  onTest: () => void;
  onContinue: () => void;
}

export const PrinterConfigureStep: React.FC<PrinterConfigureStepProps> = ({
  selectedProvider,
  config,
  currentConfig,
  error,
  success,
  testPrintLoading,
  onFieldChange,
  onBack,
  onTest,
  onContinue,
}) => {
  const providerConfig = getProviderInfo(selectedProvider);
  if (!providerConfig) return null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure {providerConfig.name}
      </Typography>

      {providerConfig.fields.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          No configuration required for {providerConfig.name}
        </Alert>
      ) : (
        <Box>
          {providerConfig.fields.map((field) => (
            <TextField
              key={field.name}
              fullWidth
              margin="normal"
              label={field.label}
              type={field.type || 'text'}
              value={config[field.name] || field.default || ''}
              onChange={(e) => onFieldChange(field.name, e.target.value)}
              required={field.required}
            />
          ))}
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <BridgeEnvSnippet selectedProvider={selectedProvider} currentConfig={currentConfig} />

      <Box mt={3} display="flex" gap={2}>
        <Button onClick={onBack}>Back</Button>
        <Button
          variant="contained"
          onClick={onTest}
          disabled={testPrintLoading}
          startIcon={testPrintLoading ? <CircularProgress size={20} /> : <PrintIcon />}
        >
          Test Configuration
        </Button>
        {success && (
          <Button variant="contained" color="success" onClick={onContinue} startIcon={<CheckIcon />}>
            Continue
          </Button>
        )}
      </Box>
    </Box>
  );
};
