/**
 * Error Display Component
 * Handles the visual representation of errors with user-friendly UI
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import { ErrorDisplayProps, ErrorSeverity } from './types';
import { useErrorHandler } from './useErrorHandler';

/**
 * Error Display Component
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorInfo,
  errorId,
  retryCount,
  maxRetries,
  level,
  onRetry,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const { determineErrorSeverity, formatErrorForDisplay } = useErrorHandler();
  
  const severity = determineErrorSeverity(error);
  const canRetry = retryCount < maxRetries;
  const displayMessage = formatErrorForDisplay(error);

  /**
   * Render severity chip with appropriate color
   */
  const renderSeverityChip = (severity: ErrorSeverity) => {
    const severityConfig = {
      low: { color: 'info', label: 'Mineur' },
      medium: { color: 'warning', label: 'Modéré' },
      high: { color: 'error', label: 'Élevé' },
      critical: { color: 'error', label: 'Critique' },
    };

    const config = severityConfig[severity];
    return (
      <Chip
        size="small"
        color={config.color as any}
        label={`Gravité: ${config.label}`}
      />
    );
  };

  /**
   * Get appropriate retry button text
   */
  const getRetryButtonText = () => {
    if (!canRetry) {
      return 'Recharger la page';
    }
    return retryCount === 0 ? 'Réessayer' : `Réessayer (${retryCount + 1}/${maxRetries})`;
  };

  /**
   * Handle retry button click
   */
  const handleRetry = () => {
    if (canRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  /**
   * Toggle technical details visibility
   */
  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="300px"
      p={3}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 600,
          width: '100%',
          textAlign: 'center',
          backgroundColor: severity === 'critical' ? 'error.light' : 'background.paper',
        }}
      >
        <ErrorIcon
          sx={{
            fontSize: 64,
            color: severity === 'critical' ? 'error.main' : 'warning.main',
            mb: 2,
          }}
        />

        <Typography variant="h5" gutterBottom color="textPrimary">
          {severity === 'critical' ? 'Erreur Critique' : 'Erreur'}
        </Typography>

        <Typography variant="body1" paragraph color="textSecondary">
          {severity === 'critical'
            ? "Une erreur critique empêche le bon fonctionnement de l'application."
            : "Une erreur inattendue s'est produite dans cette section."}
        </Typography>

        <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center" mb={2}>
          {renderSeverityChip(severity)}
          <Chip size="small" label={`Niveau: ${level}`} />
          <Chip size="small" variant="outlined" label={`ID: ${errorId.slice(-8)}`} />
        </Box>

        <Alert severity={severity === 'critical' ? 'error' : 'warning'} sx={{ width: '100%', mb: 3 }}>
          <AlertTitle>Détails de l&apos;erreur</AlertTitle>
          {displayMessage}
        </Alert>

        <Box display="flex" gap={2} flexWrap="wrap" justifyContent="center" mb={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
            size="large"
          >
            {getRetryButtonText()}
          </Button>
        </Box>

        {process.env.NODE_ENV === 'development' && errorInfo && (
          <Accordion sx={{ width: '100%', mt: 2 }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              onClick={toggleDetails}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <BugReportIcon />
                <Typography>Détails techniques (développement)</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                component="pre"
                sx={{
                  overflow: 'auto',
                  fontSize: '0.75rem',
                  backgroundColor: 'grey.100',
                  p: 2,
                  borderRadius: 1,
                  maxHeight: '300px',
                  textAlign: 'left',
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Error ID: {errorId}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Stack Trace:
                </Typography>
                {error.stack}

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Component Stack:
                </Typography>
                {errorInfo.componentStack}

                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Error Name: {error.name}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Retry Count: {retryCount}/{maxRetries}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Timestamp: {new Date().toISOString()}
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {severity === 'critical' && (
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              Si le problème persiste, veuillez contacter le support technique.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ErrorDisplay;

