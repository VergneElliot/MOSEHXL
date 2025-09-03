/**
 * Loading Spinners and Indicators
 * Reusable loading spinner components with animations
 */

import React from 'react';
import {
  Box,
  CircularProgress,
  Fade,
  LinearProgress,
  alpha,
  keyframes,
  styled,
} from '@mui/material';

/**
 * Pulse animation for loading indicators
 */
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.7;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

/**
 * Styled spinner with pulse animation
 */
const PulsingSpinner = styled(CircularProgress)(({ theme }) => ({
  animation: `${pulse} 2s ease-in-out infinite`,
}));

/**
 * Basic spinner component
 */
export const Spinner: React.FC<{
  size?: number;
  color?: 'primary' | 'secondary' | 'inherit';
  variant?: 'determinate' | 'indeterminate';
  value?: number;
  showPulse?: boolean;
}> = ({ 
  size = 40, 
  color = 'primary', 
  variant = 'indeterminate', 
  value,
  showPulse = false 
}) => {
  const SpinnerComponent = showPulse ? PulsingSpinner : CircularProgress;
  
  return (
    <SpinnerComponent
      size={size}
      color={color}
      variant={variant}
      value={value}
      data-testid="loading-spinner"
    />
  );
};

/**
 * Full page loading overlay
 */
export const FullPageLoader: React.FC<{
  message?: string;
  backdrop?: boolean;
  size?: number;
}> = ({ 
  message = 'Loading...', 
  backdrop = true,
  size = 60 
}) => (
  <Fade in timeout={300}>
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backgroundColor: backdrop ? alpha('#000', 0.3) : 'transparent',
        backdropFilter: backdrop ? 'blur(2px)' : 'none',
      }}
    >
      <Spinner size={size} showPulse />
      {message && (
        <Box sx={{ mt: 2, color: 'text.primary', fontSize: '1.1rem' }}>
          {message}
        </Box>
      )}
    </Box>
  </Fade>
);

/**
 * Inline loading indicator
 */
export const InlineLoader: React.FC<{
  size?: number;
  message?: string;
  direction?: 'row' | 'column';
}> = ({ 
  size = 24, 
  message, 
  direction = 'row' 
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: direction,
      alignItems: 'center',
      justifyContent: 'center',
      gap: direction === 'row' ? 1 : 0.5,
      py: 1,
    }}
  >
    <Spinner size={size} />
    {message && (
      <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        {message}
      </Box>
    )}
  </Box>
);

/**
 * Progress bar with customizable styling
 */
export const ProgressBar: React.FC<{
  value?: number;
  variant?: 'determinate' | 'indeterminate';
  height?: number;
  borderRadius?: number;
  showPercentage?: boolean;
}> = ({ 
  value = 0, 
  variant = 'indeterminate',
  height = 8,
  borderRadius = 4,
  showPercentage = false 
}) => (
  <Box sx={{ width: '100%', position: 'relative' }}>
    <LinearProgress
      variant={variant}
      value={value}
      sx={{
        height,
        borderRadius,
        '& .MuiLinearProgress-bar': {
          borderRadius,
        },
      }}
    />
    {showPercentage && variant === 'determinate' && (
      <Box
        sx={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '0.75rem',
          color: 'text.secondary',
          mr: 1,
        }}
      >
        {Math.round(value)}%
      </Box>
    )}
  </Box>
);
