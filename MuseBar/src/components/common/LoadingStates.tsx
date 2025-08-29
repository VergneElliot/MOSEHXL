/**
 * Loading States - Advanced Loading Components
 * Comprehensive loading indicators for different scenarios
 */

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Fade,
  LinearProgress,
  Stack,
  Typography,
  alpha,
  keyframes,
  styled,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  HourglassEmpty as HourglassIcon,
} from '@mui/icons-material';

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
 * Animated Loading Container
 */
const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  minHeight: 200,
  animation: `${pulse} 2s ease-in-out infinite`,
}));

/**
 * Basic Spinner Component
 */
export const Spinner: React.FC<{
  size?: number;
  thickness?: number;
  color?: 'primary' | 'secondary' | 'inherit';
}> = ({ size = 40, thickness = 4, color = 'primary' }) => {
  return (
    <CircularProgress 
      size={size} 
      thickness={thickness} 
      color={color}
      sx={{
        animationDuration: '1.4s',
      }}
    />
  );
};

/**
 * Full Page Loading Screen
 */
export const FullPageLoader: React.FC<{
  message?: string;
  showProgress?: boolean;
  progress?: number;
}> = ({ message = 'Loading...', showProgress = false, progress = 0 }) => {
  return (
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
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        zIndex: 9999,
        backdropFilter: 'blur(2px)',
      }}
    >
      <LoadingContainer>
        <Spinner size={60} thickness={4} />
        <Typography 
          variant="h6" 
          sx={{ mt: 2, color: 'text.secondary' }}
        >
          {message}
        </Typography>
        {showProgress && (
          <Box sx={{ width: 200, mt: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography 
              variant="caption" 
              sx={{ mt: 1, textAlign: 'center', display: 'block' }}
            >
              {Math.round(progress)}%
            </Typography>
          </Box>
        )}
      </LoadingContainer>
    </Box>
  );
};

/**
 * Progressive Loading Button
 */
export const ProgressiveButton: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  size?: 'small' | 'medium' | 'large';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
}> = ({ 
  loading, 
  children, 
  onClick, 
  disabled, 
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  startIcon,
  endIcon,
  fullWidth = false,
}) => {
  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      startIcon={loading ? <Spinner size={16} color="inherit" /> : startIcon}
      endIcon={!loading ? endIcon : undefined}
      fullWidth={fullWidth}
      sx={{
        position: 'relative',
        ...(loading && {
          '& .MuiButton-startIcon': {
            marginRight: 1,
          },
        }),
      }}
    >
      {loading ? 'Loading...' : children}
    </Button>
  );
};

/**
 * Error State Component
 */
export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  showIcon?: boolean;
}> = ({ 
  title = 'Something went wrong',
  message = 'An error occurred while loading the data. Please try again.',
  onRetry,
  retryText = 'Try Again',
  showIcon = true,
}) => {
  return (
    <Card sx={{ textAlign: 'center' }}>
      <CardContent>
        <Stack spacing={2} alignItems="center">
          {showIcon && (
            <ErrorIcon 
              sx={{ 
                fontSize: 48, 
                color: 'error.main',
                opacity: 0.7,
              }} 
            />
          )}
          <Typography variant="h6" color="error">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
          {onRetry && (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
              sx={{ mt: 2 }}
            >
              {retryText}
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

/**
 * Empty State Component
 */
export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ 
  title = 'No data available',
  message = 'There is no data to display at the moment.',
  action,
  icon,
}) => {
  return (
    <Card sx={{ textAlign: 'center' }}>
      <CardContent>
        <Stack spacing={2} alignItems="center">
          {icon || (
            <HourglassIcon 
              sx={{ 
                fontSize: 48, 
                color: 'text.disabled',
                opacity: 0.5,
              }} 
            />
          )}
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="body2" color="text.disabled">
            {message}
          </Typography>
          {action && (
            <Box sx={{ mt: 2 }}>
              {action}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

/**
 * Success State Component
 */
export const SuccessState: React.FC<{
  title?: string;
  message?: string;
  action?: React.ReactNode;
}> = ({ 
  title = 'Success!',
  message = 'The operation completed successfully.',
  action,
}) => {
  return (
    <Card sx={{ textAlign: 'center' }}>
      <CardContent>
        <Stack spacing={2} alignItems="center">
          <SuccessIcon 
            sx={{ 
              fontSize: 48, 
              color: 'success.main',
            }} 
          />
          <Typography variant="h6" color="success.main">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
          {action && (
            <Box sx={{ mt: 2 }}>
              {action}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};