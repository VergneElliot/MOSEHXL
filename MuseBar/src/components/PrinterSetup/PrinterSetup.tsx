import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Print as PrintIcon,
  Check as CheckIcon,
  Cloud as CloudIcon,
} from '@mui/icons-material';
import { apiConfig } from '../../config/api';
import { apiCore } from '../../services/api';

interface Printer {
  id: string;
  name: string;
  description?: string;
  capabilities?: string[];
  isDefault?: boolean;
  status?: string;
  provider?: string;
}

interface PrintingConfig {
  provider: string;
  config: Record<string, unknown>;
  is_active: boolean;
  bridge_env?: string | null;
  bridge_poll_url?: string | null;
  bridge_key_header?: string | null;
}

interface ProviderField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  default?: string | number;
}

interface ProviderInfo {
  name: string;
  icon: React.ReactElement;
  description: string;
  fields: ProviderField[];
}

interface PrinterSetupProps {
  onClose?: () => void;
  embedded?: boolean;
}

interface PrintingConfigurationsResponse {
  configurations?: Array<PrintingConfig & { is_active?: boolean }>;
}

interface PrintingTestResponse {
  success?: boolean;
  message?: string;
  printJobId?: string;
}

interface PrintingConfigurationSaveResponse {
  configuration?: PrintingConfig;
  message?: string;
}

interface PrintersResponse {
  printers?: Printer[];
}

const providerInfo: Record<string, ProviderInfo> = {
  bridge: {
    name: 'MuseBar Bridge',
    icon: <CloudIcon />,
    description:
      'Recommended for cloud production: a small local bridge polls MuseBar Cloud and prints to your local Epson TM-m30II over the bar network.',
    fields: [
      { name: 'printerLabel', label: 'Printer display name (optional)', type: 'text', required: false },
    ],
  },
  'epson-server-direct': {
    name: 'Epson Server Direct Print',
    icon: <CloudIcon />,
    description:
      'TM-Intelligent Epson printers poll your MuseBar cloud URL for ePOS-Print jobs. Configure poll URL + x-epson-poll-key header in TMNet WebConfig.',
    fields: [{ name: 'printerLabel', label: 'Printer display name (optional)', type: 'text', required: false }],
  },
};

export const PrinterSetup: React.FC<PrinterSetupProps> = ({ onClose, embedded = false }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string>('bridge');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [testPrintLoading, setTestPrintLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<PrintingConfig | null>(null);

  useEffect(() => {
    loadCurrentConfiguration();
  }, []);

  const loadCurrentConfiguration = async () => {
    try {
      const token = apiCore.getToken();
      const response = await fetch(apiConfig.getEndpoint('/api/printing/configuration'), {
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (response.ok) {
        const data = (await response.json()) as PrintingConfigurationsResponse;
        if (data.configurations && data.configurations.length > 0) {
          const active = data.configurations.find((c) => c.is_active);
          if (active) {
            setCurrentConfig(active);
            setSelectedProvider(active.provider);
            setConfig(active.config);
          }
        }
      }
    } catch {
      // Non-blocking: setup UI remains usable with default state.
    }
  };

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider);
    setConfig({});
    setError(null);
    setSuccess(null);
  };

  const handleConfigChange = (field: string, value: unknown) => {
    setConfig({ ...config, [field]: value });
  };

  const validateConfiguration = () => {
    const providerConfig = providerInfo[selectedProvider as keyof typeof providerInfo];
    if (!providerConfig) return false;

    for (const field of providerConfig.fields) {
      if (field.required && !config[field.name]) {
        setError(`${field.label} is required`);
        return false;
      }
    }

    return true;
  };

  const testConfiguration = async () => {
    if (!validateConfiguration()) return;

    setTestPrintLoading(true);
    setError(null);

    try {
      const token = apiCore.getToken();
      // First save the configuration
      const saveResponse = await fetch(apiConfig.getEndpoint('/api/printing/configuration'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          provider: selectedProvider,
          config
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save configuration');
      }

      const saved = (await saveResponse.json()) as PrintingConfigurationSaveResponse;
      if (saved.configuration) {
        setCurrentConfig(saved.configuration);
        setConfig(saved.configuration.config);
      }

      // Then test print
      const testResponse = await fetch(apiConfig.getEndpoint('/api/printing/test'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      const result = (await testResponse.json()) as PrintingTestResponse;
      
      if (result.success) {
        setSuccess(
          selectedProvider === 'bridge'
            ? `Test print queued for MuseBar Bridge${result.printJobId ? ` (${result.printJobId})` : ''}. Start the local bridge to print it.`
            : 'Test print successful!'
        );
        // Load printers if available
        loadPrinters();
      } else {
        setError(result.message || 'Test print failed');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Test failed');
    } finally {
      setTestPrintLoading(false);
    }
  };

  const loadPrinters = async () => {
    try {
      const token = apiCore.getToken();
      const response = await fetch(apiConfig.getEndpoint('/api/printing/printers'), {
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (response.ok) {
        const data = (await response.json()) as PrintersResponse;
        setPrinters(data.printers || []);
      }
    } catch {
      // Non-blocking: printer list is optional in setup wizard.
    }
  };

  const saveConfiguration = async () => {
    if (!validateConfiguration()) return;

    setLoading(true);
    setError(null);

    try {
      const token = apiCore.getToken();
      const response = await fetch(apiConfig.getEndpoint('/api/printing/configuration'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          provider: selectedProvider,
          config
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      const saved = (await response.json()) as PrintingConfigurationSaveResponse;
      if (saved.configuration) {
        setCurrentConfig(saved.configuration);
        setConfig(saved.configuration.config);
      }

      setSuccess('Configuration saved successfully!');
      setActiveStep(3);
      
      if (onClose) {
        setTimeout(onClose, 2000);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const renderBridgeEnvSnippet = () => {
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

  const renderProviderSelection = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Printing Method
      </Typography>
      <Grid container spacing={2}>
        {Object.entries(providerInfo).map(([key, info]) => (
          <Grid item xs={12} sm={6} key={key}>
            <Card 
              variant={selectedProvider === key ? "elevation" : "outlined"}
              sx={{ 
                cursor: 'pointer',
                border: selectedProvider === key ? 2 : 1,
                borderColor: selectedProvider === key ? 'primary.main' : 'divider'
              }}
              onClick={() => handleProviderSelect(key)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  {info.icon}
                  <Typography variant="h6" ml={1}>
                    {info.name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {info.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box mt={3}>
        <Button
          variant="contained"
          onClick={() => setActiveStep(1)}
          disabled={!selectedProvider}
        >
          Next
        </Button>
      </Box>
    </Box>
  );

  const renderConfiguration = () => {
    const providerConfig = providerInfo[selectedProvider as keyof typeof providerInfo];
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
                onChange={(e) => handleConfigChange(field.name, e.target.value)}
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

        {renderBridgeEnvSnippet()}

        <Box mt={3} display="flex" gap={2}>
          <Button onClick={() => setActiveStep(0)}>
            Back
          </Button>
          <Button
            variant="contained"
            onClick={testConfiguration}
            disabled={testPrintLoading}
            startIcon={testPrintLoading ? <CircularProgress size={20} /> : <PrintIcon />}
          >
            Test Configuration
          </Button>
          {success && (
            <Button
              variant="contained"
              color="success"
              onClick={() => setActiveStep(2)}
              startIcon={<CheckIcon />}
            >
              Continue
            </Button>
          )}
        </Box>
      </Box>
    );
  };

  const renderReview = () => {
    const providerConfig = providerInfo[selectedProvider as keyof typeof providerInfo];
    
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
                  {key.toLowerCase().includes('key') || key.toLowerCase().includes('password') 
                    ? '••••••••' 
                    : String(value)}
                </Typography>
              </Box>
            ))}
          </Paper>
        )}

        {renderBridgeEnvSnippet()}

        {printers.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Available Printers
            </Typography>
            <List dense>
              {printers.map((printer) => (
                <ListItem key={printer.id}>
                  <ListItemText
                    primary={printer.name}
                    secondary={printer.description}
                  />
                  {printer.isDefault && (
                    <Chip label="Default" size="small" color="primary" />
                  )}
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        <Box mt={3} display="flex" gap={2}>
          <Button onClick={() => setActiveStep(1)}>
            Back
          </Button>
          <Button
            variant="contained"
            onClick={saveConfiguration}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            Save Configuration
          </Button>
        </Box>
      </Box>
    );
  };

  const renderSuccess = () => (
    <Box textAlign="center" py={4}>
      <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Configuration Saved!
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Your printing configuration has been saved successfully.
      </Typography>
      <Box textAlign="left">
        {renderBridgeEnvSnippet()}
      </Box>
      {onClose && (
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      )}
    </Box>
  );

  const steps = [
    { label: 'Select Provider', content: renderProviderSelection },
    { label: 'Configure', content: renderConfiguration },
    { label: 'Review', content: renderReview },
    { label: 'Complete', content: renderSuccess }
  ];

  if (embedded) {
    const activeContent = steps[activeStep]?.content;
    return (
      <Box>
        {activeContent ? activeContent() : null}
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Printer Setup
      </Typography>
      
      {currentConfig && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Current configuration: {providerInfo[currentConfig.provider as keyof typeof providerInfo]?.name || currentConfig.provider}
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>{step.label}</StepLabel>
            <StepContent>
              {step.content()}
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Paper>
  );
};
