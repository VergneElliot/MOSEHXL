/**
 * State Display Components
 * Components for displaying various states (error, empty, success)
 */

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  HourglassEmpty as HourglassIcon,
  Inbox as InboxIcon,
} from '@mui/icons-material';

/**
 * Error state component with retry functionality
 */
export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  showIcon?: boolean;
  variant?: 'card' | 'inline';
}> = ({
  title = 'Something went wrong',
  message = 'An error occurred while loading the data.',
  onRetry,
  retryText = 'Try Again',
  showIcon = true,
  variant = 'card',
}) => {
  const content = (
    <Stack spacing={2} alignItems="center" textAlign="center" sx={{ py: variant === 'card' ? 3 : 2 }}>
      {showIcon && (
        <ErrorIcon 
          sx={{ 
            fontSize: variant === 'card' ? 48 : 32, 
            color: 'error.main',
            opacity: 0.8,
          }} 
        />
      )}
      
      <Box>
        <Typography 
          variant={variant === 'card' ? 'h6' : 'subtitle1'} 
          color="error" 
          gutterBottom
        >
          {title}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ maxWidth: 400 }}
        >
          {message}
        </Typography>
      </Box>
      
      {onRetry && (
        <Button
          variant="outlined"
          color="error"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          size={variant === 'card' ? 'medium' : 'small'}
        >
          {retryText}
        </Button>
      )}
    </Stack>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return <Box>{content}</Box>;
};

/**
 * Empty state component
 */
export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  icon?: React.ReactNode;
  variant?: 'card' | 'inline';
}> = ({
  title = 'No data found',
  message = 'There are no items to display.',
  action,
  icon = <InboxIcon />,
  variant = 'card',
}) => {
  const content = (
    <Stack spacing={2} alignItems="center" textAlign="center" sx={{ py: variant === 'card' ? 4 : 3 }}>
      <Box sx={{ color: 'text.disabled', fontSize: variant === 'card' ? 56 : 40 }}>
        {icon}
      </Box>
      
      <Box>
        <Typography 
          variant={variant === 'card' ? 'h6' : 'subtitle1'} 
          color="text.primary" 
          gutterBottom
        >
          {title}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ maxWidth: 400 }}
        >
          {message}
        </Typography>
      </Box>
      
      {action && (
        <Button
          variant="contained"
          color="primary"
          startIcon={action.icon}
          onClick={action.onClick}
          size={variant === 'card' ? 'medium' : 'small'}
        >
          {action.label}
        </Button>
      )}
    </Stack>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return <Box>{content}</Box>;
};

/**
 * Success state component
 */
export const SuccessState: React.FC<{
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  showIcon?: boolean;
  variant?: 'card' | 'inline';
  autoHide?: number;
}> = ({
  title = 'Success!',
  message = 'Operation completed successfully.',
  action,
  showIcon = true,
  variant = 'card',
  autoHide,
}) => {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => setVisible(false), autoHide);
      return () => clearTimeout(timer);
    }
  }, [autoHide]);

  if (!visible) return null;

  const content = (
    <Stack spacing={2} alignItems="center" textAlign="center" sx={{ py: variant === 'card' ? 3 : 2 }}>
      {showIcon && (
        <SuccessIcon 
          sx={{ 
            fontSize: variant === 'card' ? 48 : 32, 
            color: 'success.main',
          }} 
        />
      )}
      
      <Box>
        <Typography 
          variant={variant === 'card' ? 'h6' : 'subtitle1'} 
          color="success.main" 
          gutterBottom
        >
          {title}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ maxWidth: 400 }}
        >
          {message}
        </Typography>
      </Box>
      
      {action && (
        <Button
          variant="outlined"
          color="success"
          onClick={action.onClick}
          size={variant === 'card' ? 'medium' : 'small'}
        >
          {action.label}
        </Button>
      )}
    </Stack>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return <Box>{content}</Box>;
};

/**
 * Waiting/Processing state component
 */
export const WaitingState: React.FC<{
  title?: string;
  message?: string;
  showIcon?: boolean;
  variant?: 'card' | 'inline';
}> = ({
  title = 'Processing...',
  message = 'Please wait while we process your request.',
  showIcon = true,
  variant = 'card',
}) => {
  const content = (
    <Stack spacing={2} alignItems="center" textAlign="center" sx={{ py: variant === 'card' ? 3 : 2 }}>
      {showIcon && (
        <HourglassIcon 
          sx={{ 
            fontSize: variant === 'card' ? 48 : 32, 
            color: 'warning.main',
            animation: 'pulse 2s ease-in-out infinite',
          }} 
        />
      )}
      
      <Box>
        <Typography 
          variant={variant === 'card' ? 'h6' : 'subtitle1'} 
          color="text.primary" 
          gutterBottom
        >
          {title}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ maxWidth: 400 }}
        >
          {message}
        </Typography>
      </Box>
    </Stack>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return <Box>{content}</Box>;
};
