/**
 * Loading Button Components
 * Buttons with integrated loading states and progress indicators
 */

import React from 'react';
import {
  Button,
  ButtonProps,
  CircularProgress,
  Box,
  alpha,
} from '@mui/material';
import { CheckCircle as SuccessIcon } from '@mui/icons-material';

interface ProgressiveButtonProps extends Omit<ButtonProps, 'children'> {
  loading: boolean;
  success?: boolean;
  loadingText?: string;
  successText?: string;
  children: React.ReactNode;
  loadingSize?: number;
  showSuccessIcon?: boolean;
  resetSuccessAfter?: number;
}

/**
 * Button with loading and success states
 */
export const ProgressiveButton: React.FC<ProgressiveButtonProps> = ({
  loading,
  success = false,
  loadingText,
  successText,
  children,
  loadingSize = 20,
  showSuccessIcon = true,
  resetSuccessAfter,
  disabled,
  color = 'primary',
  variant = 'contained',
  ...buttonProps
}) => {
  const [internalSuccess, setInternalSuccess] = React.useState(false);

  React.useEffect(() => {
    if (success) {
      setInternalSuccess(true);
      if (resetSuccessAfter) {
        const timer = setTimeout(() => setInternalSuccess(false), resetSuccessAfter);
        return () => clearTimeout(timer);
      }
    }
  }, [success, resetSuccessAfter]);

  const isDisabled = disabled || loading || internalSuccess;
  const showSuccess = internalSuccess || success;

  return (
    <Button
      {...buttonProps}
      disabled={isDisabled}
      color={showSuccess ? 'success' : color}
      variant={variant}
      sx={{
        position: 'relative',
        transition: 'all 0.3s ease',
        ...buttonProps.sx,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {loading && (
          <CircularProgress
            size={loadingSize}
            color="inherit"
            sx={{ mr: loadingText ? 1 : 0 }}
          />
        )}
        
        {showSuccess && showSuccessIcon && (
          <SuccessIcon
            sx={{ 
              mr: successText ? 1 : 0,
              fontSize: loadingSize + 4,
            }}
          />
        )}
        
        {loading && loadingText ? loadingText : 
         showSuccess && successText ? successText : 
         children}
      </Box>
    </Button>
  );
};

/**
 * Simple loading button wrapper
 */
export const LoadingButton: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  loadingSize?: number;
} & ButtonProps> = ({ 
  loading, 
  children, 
  loadingSize = 18,
  disabled,
  ...props 
}) => (
  <Button
    {...props}
    disabled={disabled || loading}
    startIcon={loading ? <CircularProgress size={loadingSize} color="inherit" /> : props.startIcon}
  >
    {children}
  </Button>
);

/**
 * Submit button with enhanced loading states
 */
export const SubmitButton: React.FC<{
  isSubmitting: boolean;
  isValid?: boolean;
  submitText?: string;
  submittingText?: string;
  children?: React.ReactNode;
} & ButtonProps> = ({
  isSubmitting,
  isValid = true,
  submitText = 'Submit',
  submittingText = 'Submitting...',
  children,
  ...props
}) => (
  <ProgressiveButton
    loading={isSubmitting}
    loadingText={submittingText}
    disabled={!isValid}
    type="submit"
    variant="contained"
    color="primary"
    {...props}
  >
    {children || submitText}
  </ProgressiveButton>
);
