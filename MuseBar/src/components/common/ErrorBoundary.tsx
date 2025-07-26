import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Paper,
  Container,
  useTheme
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('🚨 Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo
    });

    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      errorId: this.state.errorId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Create a mailto link with error details
    const subject = encodeURIComponent(`[MuseBar] Error Report - ${this.state.errorId}`);
    const body = encodeURIComponent(`
Error Report Details:

Error ID: ${this.state.errorId}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}

Error Message: ${this.state.error?.message}

Stack Trace:
${this.state.error?.stack}

Component Stack:
${this.state.errorInfo?.componentStack}

User Agent: ${navigator.userAgent}

Please provide any additional context about what you were doing when this error occurred.
    `);

    window.open(`mailto:support@musebar.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <ErrorFallback
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        errorId={this.state.errorId}
        onRetry={this.handleRetry}
        onGoHome={this.handleGoHome}
        onReportBug={this.handleReportBug}
      />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  onRetry: () => void;
  onGoHome: () => void;
  onReportBug: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  onRetry,
  onGoHome,
  onReportBug
}) => {
  const theme = useTheme();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        
        <Typography variant="h4" component="h1" gutterBottom color="error.main">
          Oups ! Une erreur s'est produite
        </Typography>
        
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          Une erreur inattendue s'est produite dans l'application. 
          Notre équipe a été notifiée et travaille à résoudre le problème.
        </Typography>

        <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
          <AlertTitle>Détails techniques</AlertTitle>
          <Typography variant="body2">
            <strong>ID d'erreur:</strong> {errorId}
            <br />
            <strong>Message:</strong> {error?.message}
            <br />
            <strong>Page:</strong> {window.location.pathname}
          </Typography>
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            size="large"
          >
            Réessayer
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<HomeIcon />}
            onClick={onGoHome}
            size="large"
          >
            Retour à l'accueil
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<BugReportIcon />}
            onClick={onReportBug}
            size="large"
            color="secondary"
          >
            Signaler le problème
          </Button>
        </Box>

        {/* Development mode: Show detailed error info */}
        {process.env.NODE_ENV === 'development' && errorInfo && (
          <Box sx={{ mt: 4, textAlign: 'left' }}>
            <Typography variant="h6" gutterBottom>
              Détails de développement:
            </Typography>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                bgcolor: 'grey.50',
                maxHeight: 300,
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}
            >
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {errorInfo.componentStack}
              </Typography>
            </Paper>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ErrorBoundary; 