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
  config: any;
  is_active: boolean;
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

const providerInfo: Record<string, ProviderInfo> = {
  'epson-server-direct': {
    name: 'Epson Server Direct Print',
    icon: <CloudIcon />,
    description:
      'TM-Intelligent Epson printers poll your MuseBar cloud URL for ePOS-Print jobs. Minimal software on site — configure the poll URL in the printer web settings (TMNet WebConfig).',
    fields: [{ name: 'printerLabel', label: 'Printer display name (optional)', type: 'text', required: false }],
  },
};

export const PrinterSetup: React.FC<PrinterSetupProps> = ({ onClose, embedded = false }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string>('epson-server-direct');
  const [config, setConfig] = useState<any>({});
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
      const response = await fetch(apiConfig.getEndpoint('/api/printing/configuration'), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.configurations && data.configurations.length > 0) {
          const active = data.configurations.find((c: any) => c.is_active);
          if (active) {
            setCurrentConfig(active);
            setSelectedProvider(active.provider);
            setConfig(active.config);
          }
        }
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider);
    setConfig({});
    setError(null);
    setSuccess(null);
  };

  const handleConfigChange = (field: string, value: any) => {
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
      // First save the configuration
      const saveResponse = await fetch(apiConfig.getEndpoint('/api/printing/configuration'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          provider: selectedProvider,
          config
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save configuration');
      }

      // Then test print
      const testResponse = await fetch(apiConfig.getEndpoint('/api/printing/test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const result = await testResponse.json();
      
      if (result.success) {
        setSuccess('Test print successful!');
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
      const response = await fetch(apiConfig.getEndpoint('/api/printing/printers'), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPrinters(data.printers || []);
      }
    } catch (error) {
      console.error('Error loading printers:', error);
    }
  };

  const saveConfiguration = async () => {
    if (!validateConfiguration()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiConfig.getEndpoint('/api/printing/configuration'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          provider: selectedProvider,
          config
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
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
    return (
      <Box>
        {steps[activeStep].content()}
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
