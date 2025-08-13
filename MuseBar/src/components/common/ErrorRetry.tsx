import React from 'react';
import { Alert, Box, Typography } from '@mui/material';

interface ErrorRetryProps {
  error: Error | string;
  onRetry: () => void;
  retryText?: string;
  showDetails?: boolean;
}

const ErrorRetry: React.FC<ErrorRetryProps> = ({
  error,
  onRetry,
  retryText = 'Réessayer',
  showDetails = false,
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <Alert
      severity="error"
      action={<button onClick={onRetry} style={{ marginLeft: 8 }}>{retryText}</button>}
    >
      <Box>
        <Typography variant="body2">{errorMessage}</Typography>
        {showDetails && typeof error === 'object' && (error as Error).stack && (
          <Box
            component="pre"
            sx={{
              mt: 1,
              p: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              borderRadius: 1,
              fontSize: '0.75rem',
              overflow: 'auto',
              maxHeight: 200,
            }}
          >
            {(error as Error).stack}
          </Box>
        )}
      </Box>
    </Alert>
  );
};

export default ErrorRetry;


