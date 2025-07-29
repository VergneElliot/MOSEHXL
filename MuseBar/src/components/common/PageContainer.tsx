import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
  CircularProgress
} from '@mui/material';
import { BaseComponentProps, WithChildren, SnackbarState } from '../../types/ui';

interface PageContainerProps extends BaseComponentProps, WithChildren {
  title?: string;
  subtitle?: string;
  icon?: React.ReactElement;
  loading?: boolean;
  error?: string | null;
  onErrorClose?: () => void;
  snackbar?: SnackbarState;
  onSnackbarClose?: () => void;
  headerActions?: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  icon,
  loading = false,
  error,
  onErrorClose,
  snackbar,
  onSnackbarClose,
  headerActions,
  maxWidth = 'xl',
  children,
  className,
  'data-testid': testId
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh' 
        }}
        data-testid={testId}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        maxWidth: maxWidth ? theme.breakpoints.values[maxWidth] : undefined,
        mx: 'auto',
        px: { xs: 2, sm: 3 }
      }}
      className={className}
      data-testid={testId}
    >
      {/* Header Section */}
      {(title || headerActions) && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            {title && (
              <Typography 
                variant={isMobile ? "h5" : "h4"} 
                component="h1" 
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
              >
                {icon}
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="subtitle1" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {headerActions && (
            <Box sx={{ ml: 2 }}>
              {headerActions}
            </Box>
          )}
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={onErrorClose}
        >
          {error}
        </Alert>
      )}

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {children}
      </Box>

      {/* Snackbar */}
      {snackbar && (
        <Snackbar
          open={snackbar.open}
          autoHideDuration={snackbar.autoHideDuration || 6000}
          onClose={onSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={onSnackbarClose} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default PageContainer; 