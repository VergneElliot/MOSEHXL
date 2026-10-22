import React from 'react';
import { Alert, Box, Paper, Step, StepContent, StepLabel, Stepper, Typography } from '@mui/material';
import { PrinterProviderStep } from './PrinterProviderStep';
import { PrinterConfigureStep } from './PrinterConfigureStep';
import { PrinterReviewStep } from './PrinterReviewStep';
import { PrinterSuccessStep } from './PrinterSuccessStep';
import { getProviderInfo } from './printerSetupProviders';
import { usePrinterSetup } from './usePrinterSetup';

interface PrinterSetupProps {
  onClose?: () => void;
  embedded?: boolean;
}

export const PrinterSetup: React.FC<PrinterSetupProps> = ({ onClose, embedded = false }) => {
  const [state, actions] = usePrinterSetup(onClose);
  const { activeStep, selectedProvider, config, currentConfig } = state;

  const steps = [
    {
      label: 'Select Provider',
      content: () => (
        <PrinterProviderStep
          selectedProvider={selectedProvider}
          onSelect={actions.selectProvider}
          onNext={() => actions.setActiveStep(1)}
        />
      ),
    },
    {
      label: 'Configure',
      content: () => (
        <PrinterConfigureStep
          selectedProvider={selectedProvider}
          config={config}
          currentConfig={currentConfig}
          error={state.error}
          success={state.success}
          testPrintLoading={state.testPrintLoading}
          onFieldChange={actions.changeConfigField}
          onBack={() => actions.setActiveStep(0)}
          onTest={() => void actions.testConfiguration()}
          onContinue={() => actions.setActiveStep(2)}
        />
      ),
    },
    {
      label: 'Review',
      content: () => (
        <PrinterReviewStep
          selectedProvider={selectedProvider}
          config={config}
          currentConfig={currentConfig}
          printers={state.printers}
          loading={state.loading}
          onBack={() => actions.setActiveStep(1)}
          onSave={() => void actions.saveConfiguration()}
        />
      ),
    },
    {
      label: 'Complete',
      content: () => (
        <PrinterSuccessStep
          selectedProvider={selectedProvider}
          currentConfig={currentConfig}
          onClose={onClose}
        />
      ),
    },
  ];

  if (embedded) {
    const activeContent = steps[activeStep]?.content;
    return <Box>{activeContent ? activeContent() : null}</Box>;
  }

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Printer Setup
      </Typography>

      {currentConfig && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Current configuration: {getProviderInfo(currentConfig.provider)?.name || currentConfig.provider}
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step) => (
          <Step key={step.label}>
            <StepLabel>{step.label}</StepLabel>
            <StepContent>{step.content()}</StepContent>
          </Step>
        ))}
      </Stepper>
    </Paper>
  );
};
