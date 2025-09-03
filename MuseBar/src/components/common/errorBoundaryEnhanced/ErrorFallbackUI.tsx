/**
 * Error Fallback UI Components
 * UI components for displaying error states and recovery options
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  Home as HomeIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { ErrorBoundaryState } from './types';

interface ErrorFallbackUIProps {
  error: Error;
  errorId: string;
  retryCount: number;
  componentName?: string;
  showErrorDetails?: boolean;
  allowRetry?: boolean;
  onRetry: () => void;
  onGoHome: () => void;
}

export const ErrorFallbackUI: React.FC<ErrorFallbackUIProps> = ({
  error,
  errorId,
  retryCount,
  componentName,
  showErrorDetails = false,
  allowRetry = true,
  onRetry,
  onGoHome,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyErrorDetails = async () => {
    const errorDetails = `
Error ID: ${errorId}
Component: ${componentName || 'Unknown'}
Error: ${error.message}
Stack: ${error.stack}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Failed to copy error details');
    }
  };

  return (
    <Box sx={{ p: 3, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent>
          <Stack spacing={3}>
            {/* Error Icon and Title */}
            <Box sx={{ textAlign: 'center' }}>
              <BugReportIcon sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
              <Typography variant="h5" color="error" gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We apologize for the inconvenience. An unexpected error occurred.
              </Typography>
            </Box>

            {/* Error Metadata */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              <Chip
                icon={<BugReportIcon />}
                label={`Error ID: ${errorId.slice(-8)}`}
                size="small"
                variant="outlined"
              />
              {componentName && (
                <Chip
                  label={`Component: ${componentName}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {retryCount > 0 && (
                <Chip
                  label={`Retries: ${retryCount}`}
                  size="small"
                  variant="outlined"
                  color="warning"
                />
              )}
            </Box>

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} justifyContent="center">
              {allowRetry && (
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={onRetry}
                  disabled={retryCount >= 3}
                >
                  {retryCount >= 3 ? 'Max Retries Reached' : 'Try Again'}
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={onGoHome}
              >
                Go Home
              </Button>
            </Stack>

            {/* Error Details Section */}
            {showErrorDetails && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Button
                    startIcon={<ExpandMoreIcon sx={{ transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />}
                    onClick={() => setShowDetails(!showDetails)}
                    size="small"
                  >
                    {showDetails ? 'Hide' : 'Show'} Error Details
                  </Button>
                </Box>

                <Collapse in={showDetails}>
                  <Alert severity="error">
                    <AlertTitle>
                      Technical Details
                      <IconButton
                        size="small"
                        onClick={copyErrorDetails}
                        sx={{ ml: 1 }}
                        title="Copy error details"
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                      {copied && (
                        <Chip
                          label="Copied!"
                          size="small"
                          color="success"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </AlertTitle>
                    <Box component="pre" sx={{ mt: 1, fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      <strong>Error:</strong> {error.message}
                      {error.stack && (
                        <>
                          <br /><br />
                          <strong>Stack Trace:</strong><br />
                          {error.stack}
                        </>
                      )}
                    </Box>
                  </Alert>
                </Collapse>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

/**
 * Simple error fallback for minimal error display
 */
export const SimpleErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <Box sx={{ p: 2, textAlign: 'center' }}>
    <Typography variant="h6" color="error" gutterBottom>
      Oops! Something went wrong
    </Typography>
    <Button startIcon={<RefreshIcon />} onClick={onRetry} variant="outlined" size="small">
      Try Again
    </Button>
  </Box>
);
