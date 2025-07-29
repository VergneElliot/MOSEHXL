import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
  SxProps,
  Theme
} from '@mui/material';
import { BaseComponentProps } from '../../types/ui';

interface LoadingSpinnerProps extends BaseComponentProps {
  size?: number | string;
  message?: string;
  backdrop?: boolean;
  variant?: 'inline' | 'centered' | 'overlay';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  message,
  backdrop = false,
  variant = 'centered',
  className,
  'data-testid': testId
}) => {
  let containerStyles: SxProps<Theme>;
  
  switch (variant) {
    case 'inline':
      containerStyles = { display: 'inline-flex', alignItems: 'center', gap: 1 };
      break;
    case 'overlay':
      containerStyles = { 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 1000
      };
      break;
    case 'centered':
    default:
      containerStyles = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        py: 4
      };
      break;
  }

  const spinner = (
    <Box 
      sx={containerStyles}
      className={className}
      data-testid={testId}
    >
      <CircularProgress size={size} />
      {message && variant !== 'inline' && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
      {message && variant === 'inline' && (
        <Typography variant="body2" color="text.secondary" component="span">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (backdrop) {
    return (
      <Backdrop open sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        {spinner}
      </Backdrop>
    );
  }

  return spinner;
};

export default LoadingSpinner; 