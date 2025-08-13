import React from 'react';
import { Box, CircularProgress } from '@mui/material';

interface LoadingButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  size?: 'small' | 'medium' | 'large';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
  loadingText?: string;
}

const LoadingButton: React.FC<LoadingButtonProps & React.ComponentProps<'button'>> = ({
  loading = false,
  children,
  onClick,
  disabled = false,
  loadingText,
  ...buttonProps
}) => {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <button
        {...buttonProps}
        disabled={disabled || loading}
        onClick={onClick}
        style={{
          ...(loading && { color: 'transparent' }),
        }}
      >
        {loadingText && loading ? loadingText : children}
      </button>
      {loading && (
        <CircularProgress
          size={24}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginTop: '-12px',
            marginLeft: '-12px',
          }}
        />
      )}
    </Box>
  );
};

export default LoadingButton;


