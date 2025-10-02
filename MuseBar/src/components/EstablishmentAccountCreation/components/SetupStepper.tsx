/**
 * Setup Stepper Component
 * Reusable stepper component for the establishment account creation flow
 */

import React from 'react';
import { 
  Stepper, 
  Step, 
  StepLabel, 
  StepConnector, 
  Box, 
  Typography,
  useTheme,
  styled
} from '@mui/material';
import { Check } from '@mui/icons-material';
import { SetupStep } from '../types';

interface SetupStepperProps {
  steps: SetupStep[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
}

const StyledStepConnector = styled(StepConnector)(({ theme }) => ({
  '&.MuiStepConnector-root': {
    top: 22,
  },
  '&.MuiStepConnector-line': {
    height: 3,
    border: 0,
    backgroundColor: theme.palette.divider,
    borderRadius: 1,
  },
  '&.Mui-active .MuiStepConnector-line': {
    backgroundColor: theme.palette.primary.main,
  },
  '&.Mui-completed .MuiStepConnector-line': {
    backgroundColor: theme.palette.primary.main,
  },
}));

const StyledStepIcon = styled('div')<{ ownerState: { active?: boolean; completed?: boolean } }>(
  ({ theme, ownerState }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
    zIndex: 1,
    color: '#fff',
    width: 50,
    height: 50,
    display: 'flex',
    borderRadius: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    ...(ownerState.active && {
      backgroundColor: theme.palette.primary.main,
    }),
    ...(ownerState.completed && {
      backgroundColor: theme.palette.primary.main,
    }),
  }),
);

interface StepIconProps {
  active?: boolean;
  completed?: boolean;
  stepNumber: number;
}

const StepIcon: React.FC<StepIconProps> = ({ active = false, completed = false, stepNumber }) => {
  return (
    <StyledStepIcon ownerState={{ active, completed }}>
      {completed ? <Check /> : stepNumber}
    </StyledStepIcon>
  );
};

const SetupStepper: React.FC<SetupStepperProps> = ({ 
  steps, 
  currentStep, 
  onStepClick 
}) => {
  const theme = useTheme();

  const handleStepClick = (stepId: number) => {
    if (onStepClick) {
      onStepClick(stepId);
    }
  };

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Stepper 
        activeStep={currentStep - 1} 
        connector={<StyledStepConnector />}
        alternativeLabel
      >
        {steps.map((step) => (
          <Step 
            key={step.id}
            onClick={() => handleStepClick(step.id)}
            sx={{ 
              cursor: onStepClick ? 'pointer' : 'default',
              '&:hover': onStepClick ? {
                '& .MuiStepLabel-label': {
                  color: theme.palette.primary.main,
                }
              } : {}
            }}
          >
            <StepLabel
              StepIconComponent={(props) => (
                <StepIcon 
                  {...props} 
                  stepNumber={step.id}
                />
              )}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                {step.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {step.description}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default SetupStepper;
