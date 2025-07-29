import React from 'react';
import { Alert, AlertTitle, Box, Button, Typography, Paper, Collapse } from '@mui/material';
import {
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { BaseComponentProps } from '../../types/ui';
import { ErrorInfo } from '../../hooks/useErrorHandler';

interface ErrorDisplayProps extends BaseComponentProps {
  error: ErrorInfo | string | null;
  severity?: 'error' | 'warning' | 'info';
  showDetails?: boolean;
  showRetry?: boolean;
  showReport?: boolean;
  onRetry?: () => void;
  onReport?: () => void;
  variant?: 'alert' | 'card' | 'inline';
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  severity = 'error',
  showDetails = false,
  showRetry = false,
  showReport = false,
  onRetry,
  onReport,
  variant = 'alert',
  className,
  'data-testid': testId,
}) => {
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  if (!error) return null;

  const errorInfo: ErrorInfo =
    typeof error === 'string' ? { message: error, timestamp: new Date() } : error;

  const renderContent = () => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {errorInfo.message}
          </Typography>

          {errorInfo.context && (
            <Typography variant="caption" color="text.secondary">
              Contexte: {errorInfo.context}
            </Typography>
          )}
        </Box>

        {(showRetry || showReport || showDetails) && (
          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            {showDetails && errorInfo.details && (
              <Button
                size="small"
                startIcon={detailsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setDetailsOpen(!detailsOpen)}
              >
                Détails
              </Button>
            )}

            {showRetry && onRetry && (
              <Button size="small" startIcon={<RefreshIcon />} onClick={onRetry} variant="outlined">
                Réessayer
              </Button>
            )}

            {showReport && onReport && (
              <Button
                size="small"
                startIcon={<BugReportIcon />}
                onClick={onReport}
                variant="outlined"
                color="secondary"
              >
                Signaler
              </Button>
            )}
          </Box>
        )}
      </Box>

      {showDetails && errorInfo.details && (
        <Collapse in={detailsOpen}>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Détails techniques:
            </Typography>
            <Typography
              variant="body2"
              component="pre"
              sx={{ fontSize: '0.75rem', overflow: 'auto' }}
            >
              {typeof errorInfo.details === 'string'
                ? errorInfo.details
                : JSON.stringify(errorInfo.details, null, 2)}
            </Typography>

            {errorInfo.timestamp && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Horodatage: {errorInfo.timestamp.toLocaleString('fr-FR')}
              </Typography>
            )}
          </Box>
        </Collapse>
      )}
    </>
  );

  switch (variant) {
    case 'card':
      return (
        <Paper
          elevation={1}
          sx={{ p: 2, borderLeft: 4, borderLeftColor: `${severity}.main` }}
          className={className}
          data-testid={testId}
        >
          {renderContent()}
        </Paper>
      );

    case 'inline':
      return (
        <Box sx={{ p: 1 }} className={className} data-testid={testId}>
          {renderContent()}
        </Box>
      );

    case 'alert':
    default:
      return (
        <Alert severity={severity} className={className} data-testid={testId}>
          <AlertTitle>Erreur</AlertTitle>
          {renderContent()}
        </Alert>
      );
  }
};

export default ErrorDisplay;
