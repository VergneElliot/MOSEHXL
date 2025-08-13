import React, { createContext, useContext, useState } from 'react';
import { Backdrop, Box, CircularProgress, LinearProgress, Typography } from '@mui/material';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface LoadingContextValue {
  isLoading: boolean;
  loadingMessage: string;
  progress?: number;
  setLoading: (loading: boolean, message?: string, progress?: number) => void;
  setError: (error: string) => void;
  clearError: () => void;
  error: string | null;
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

interface LoadingProviderProps {
  children: React.ReactNode;
  backdrop?: boolean;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children, backdrop = true }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Chargement...');
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [error, setErrorState] = useState<string | null>(null);

  const setLoading = (loading: boolean, message?: string, progressValue?: number) => {
    setIsLoading(loading);
    if (message) setLoadingMessage(message);
    setProgress(progressValue);
    if (!loading) setErrorState(null);
  };

  const setError = (errorMessage: string) => {
    setIsLoading(false);
    setErrorState(errorMessage);
  };

  const clearError = () => setErrorState(null);

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
      {backdrop && <GlobalLoadingOverlay />}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) throw new Error('useLoading must be used within a LoadingProvider');
  return context;
};

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


