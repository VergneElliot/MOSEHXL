/**
 * Professional Loading States System
 * Provides skeleton screens, progress indicators, and loading contexts for better UX
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Box,
  Skeleton,
  CircularProgress,
  LinearProgress,
  Typography,
  Card,
  CardContent,
  Grid,
  Fade,
  Backdrop,
  Alert,
} from '@mui/material';
import { keyframes } from '@mui/system';

/**
 * Loading state types
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Loading context interface
 */
interface LoadingContextValue {
  isLoading: boolean;
  loadingMessage: string;
  progress?: number;
  setLoading: (loading: boolean, message?: string, progress?: number) => void;
  setError: (error: string) => void;
  clearError: () => void;
  error: string | null;
}

/**
 * Loading context
 */
const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

/**
 * Loading provider props
 */
interface LoadingProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Global loading provider
 */
export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children, fallback }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Chargement...');
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [error, setErrorState] = useState<string | null>(null);

  const setLoading = (loading: boolean, message?: string, progressValue?: number) => {
    setIsLoading(loading);
    if (message) setLoadingMessage(message);
    setProgress(progressValue);
    if (!loading) {
      setErrorState(null); // Clear error when loading succeeds
    }
  };

  const setError = (errorMessage: string) => {
    setIsLoading(false);
    setErrorState(errorMessage);
  };

  const clearError = () => {
    setErrorState(null);
  };

  const value: LoadingContextValue = {
    isLoading,
    loadingMessage,
    progress,
    setLoading,
    setError,
    clearError,
    error,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {isLoading && fallback && <GlobalLoadingOverlay />}
    </LoadingContext.Provider>
  );
};

/**
 * Hook to use loading context
 */
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

/**
 * Global loading overlay
 */
const GlobalLoadingOverlay: React.FC = () => {
  const { isLoading, loadingMessage, progress } = useLoading();

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        flexDirection: 'column',
        gap: 2,
      }}
      open={isLoading}
    >
      <CircularProgress size={60} color="inherit" />
      <Typography variant="h6" component="div">
        {loadingMessage}
      </Typography>
      {progress !== undefined && (
        <Box sx={{ width: '200px' }}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="body2" color="inherit" sx={{ textAlign: 'center', mt: 1 }}>
            {Math.round(progress)}%
          </Typography>
        </Box>
      )}
    </Backdrop>
  );
};

/**
 * Skeleton component props
 */
interface SkeletonComponentProps {
  loading?: boolean;
  children: React.ReactNode;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | false;
  count?: number;
}

/**
 * Enhanced skeleton wrapper
 */
export const SkeletonWrapper: React.FC<SkeletonComponentProps> = ({
  loading = true,
  children,
  variant = 'rectangular',
  width = '100%',
  height = 40,
  animation = 'wave',
  count = 1,
}) => {
  if (!loading) return <>{children}</>;

  return (
    <Box>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          variant={variant}
          width={width}
          height={height}
          animation={animation}
          sx={{ mb: count > 1 ? 1 : 0 }}
        />
      ))}
    </Box>
  );
};

/**
 * Product grid skeleton
 */
export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <Grid container spacing={2}>
    {Array.from({ length: count }).map((_, index) => (
      <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
        <Card>
          <Skeleton variant="rectangular" height={140} />
          <CardContent>
            <Skeleton variant="text" height={24} width="80%" />
            <Skeleton variant="text" height={20} width="60%" />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Skeleton variant="text" height={20} width="40%" />
              <Skeleton variant="rectangular" height={24} width="60px" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

/**
 * Order summary skeleton
 */
export const OrderSummarySkeleton: React.FC = () => (
  <Card>
    <CardContent>
      <Skeleton variant="text" height={28} width="60%" sx={{ mb: 2 }} />
      {Array.from({ length: 3 }).map((_, index) => (
        <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Skeleton variant="text" height={20} width="70%" />
          <Skeleton variant="text" height={20} width="50px" />
        </Box>
      ))}
      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="text" height={24} width="40%" />
          <Skeleton variant="text" height={24} width="60px" />
        </Box>
        <Skeleton variant="rectangular" height={40} width="100%" />
      </Box>
    </CardContent>
  </Card>
);

/**
 * Table skeleton
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <Box>
    {/* Table header */}
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} variant="text" height={32} width="100%" />
      ))}
    </Box>
    {/* Table rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box key={rowIndex} sx={{ display: 'flex', gap: 2, mb: 1 }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="text" height={24} width="100%" />
        ))}
      </Box>
    ))}
  </Box>
);

/**
 * Pulse animation keyframes
 */
const pulseAnimation = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

/**
 * Loading spinner component
 */
interface LoadingSpinnerProps {
  size?: number;
  color?: 'primary' | 'secondary' | 'inherit';
  message?: string;
  variant?: 'circular' | 'linear';
  overlay?: boolean;
  timeout?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  color = 'primary',
  message,
  variant = 'circular',
  overlay = false,
  timeout,
}) => {
  const [showSpinner, setShowSpinner] = useState(true);

  useEffect(() => {
    if (timeout) {
      const timer = setTimeout(() => {
        setShowSpinner(false);
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [timeout]);

  if (!showSpinner) return null;

  const spinner = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        ...(overlay && {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1,
        }),
      }}
    >
      {variant === 'circular' ? (
        <CircularProgress size={size} color={color} />
      ) : (
        <Box sx={{ width: '100%', maxWidth: 300 }}>
          <LinearProgress color={color} />
        </Box>
      )}
      {message && (
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {message}
        </Typography>
      )}
    </Box>
  );

  return overlay ? (
    <Fade in={showSpinner}>
      <Box sx={{ position: 'relative', minHeight: 100 }}>{spinner}</Box>
    </Fade>
  ) : (
    spinner
  );
};

/**
 * Loading button component
 */
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

export const LoadingButton: React.FC<LoadingButtonProps> = ({
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

/**
 * Async operation hook with loading states
 */
interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showGlobalLoading?: boolean;
  loadingMessage?: string;
}

interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}

export const useAsyncOperation = <T = any>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
): AsyncOperationState<T> => {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const { showGlobalLoading = false, loadingMessage = 'Chargement...', onSuccess, onError } = options;
  const loadingContext = useLoading();
  const globalLoading = showGlobalLoading ? loadingContext : null;

  const execute = async (...args: any[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    if (globalLoading) {
      globalLoading.setLoading(true, loadingMessage);
    }

    try {
      const result = await asyncFunction(...args);
      setState(prev => ({ ...prev, data: result, loading: false }));
      
      if (globalLoading) {
        globalLoading.setLoading(false);
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, error: errorInstance, loading: false }));
      
      if (globalLoading) {
        globalLoading.setError(errorInstance.message);
      }
      
      if (onError) {
        onError(errorInstance);
      }
    }
  };

  const reset = () => {
    setState({ data: null, loading: false, error: null });
    if (globalLoading) {
      globalLoading.clearError();
    }
  };

  return {
    ...state,
    execute,
    reset,
  };
};

/**
 * Lazy loading component
 */
interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  height?: number | string;
  threshold?: number;
  rootMargin?: string;
}

export const LazyComponent: React.FC<LazyComponentProps> = ({
  children,
  fallback,
  height = 200,
  threshold = 0.1,
  rootMargin = '50px',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(ref);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(ref);

    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, [ref, threshold, rootMargin]);

  return (
    <Box
      ref={setRef}
      sx={{
        minHeight: height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isVisible ? children : fallback || <LoadingSpinner message="Chargement du contenu..." />}
    </Box>
  );
};

/**
 * Progressive loading component
 */
interface ProgressiveLoadingProps {
  stages: Array<{
    message: string;
    duration: number;
    component?: React.ReactNode;
  }>;
  onComplete?: () => void;
  children: React.ReactNode;
}

export const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({
  stages,
  onComplete,
  children,
}) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (currentStage >= stages.length) {
      if (onComplete) onComplete();
      return;
    }

    const stage = stages[currentStage];
    let progressInterval: NodeJS.Timeout;
    
    const stageTimeout = setTimeout(() => {
      setCurrentStage(prev => prev + 1);
      setProgress(0);
    }, stage.duration);

    // Update progress during stage
    progressInterval = setInterval(() => {
      setProgress(prev => {
        const increment = 100 / (stage.duration / 100);
        return Math.min(prev + increment, 100);
      });
    }, 100);

    return () => {
      clearTimeout(stageTimeout);
      clearInterval(progressInterval);
    };
  }, [currentStage, stages, onComplete]);

  if (currentStage >= stages.length) {
    return <>{children}</>;
  }

  const currentStageData = stages[currentStage];

  return (
    <Box sx={{ textAlign: 'center', p: 4 }}>
      <CircularProgress size={60} sx={{ mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        {currentStageData.message}
      </Typography>
      <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto', mb: 2 }}>
        <LinearProgress variant="determinate" value={progress} />
      </Box>
      <Typography variant="body2" color="text.secondary">
        Étape {currentStage + 1} sur {stages.length}
      </Typography>
      {currentStageData.component && (
        <Box sx={{ mt: 2 }}>{currentStageData.component}</Box>
      )}
    </Box>
  );
};

/**
 * Error retry component
 */
interface ErrorRetryProps {
  error: Error | string;
  onRetry: () => void;
  retryText?: string;
  showDetails?: boolean;
}

export const ErrorRetry: React.FC<ErrorRetryProps> = ({
  error,
  onRetry,
  retryText = 'Réessayer',
  showDetails = false,
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <Alert
      severity="error"
      action={
        <button onClick={onRetry} style={{ marginLeft: 8 }}>
          {retryText}
        </button>
      }
    >
      <Box>
        <Typography variant="body2">{errorMessage}</Typography>
        {showDetails && typeof error === 'object' && error.stack && (
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
            {error.stack}
          </Box>
        )}
      </Box>
    </Alert>
  );
}; 