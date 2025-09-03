/**
 * Custom Render Utilities
 * Provides enhanced rendering capabilities with providers for testing
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { LoadingProvider } from '../../components/common/LoadingProvider';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

/**
 * Test theme configuration
 */
const testTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

/**
 * All the providers wrapper for testing
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={testTheme}>
    <CssBaseline />
    <ErrorBoundary>
      <LoadingProvider>
        {children}
      </LoadingProvider>
    </ErrorBoundary>
  </ThemeProvider>
);

/**
 * Custom render function with providers
 */
export const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

/**
 * Render without providers (for testing components in isolation)
 */
export const renderWithoutProviders = (
  ui: ReactElement,
  options?: RenderOptions
) => render(ui, options);

/**
 * Render with specific providers only
 */
export const renderWithProviders = (
  ui: ReactElement,
  providers: {
    theme?: boolean;
    loading?: boolean;
    errorBoundary?: boolean;
  } = {},
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const {
    theme = true,
    loading = true,
    errorBoundary = true,
  } = providers;

  let wrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;

  if (theme) {
    const PreviousWrapper = wrapper;
    wrapper = ({ children }) => (
      <ThemeProvider theme={testTheme}>
        <CssBaseline />
        <PreviousWrapper>{children}</PreviousWrapper>
      </ThemeProvider>
    );
  }

  if (errorBoundary) {
    const PreviousWrapper = wrapper;
    wrapper = ({ children }) => (
      <ErrorBoundary>
        <PreviousWrapper>{children}</PreviousWrapper>
      </ErrorBoundary>
    );
  }

  if (loading) {
    const PreviousWrapper = wrapper;
    wrapper = ({ children }) => (
      <LoadingProvider>
        <PreviousWrapper>{children}</PreviousWrapper>
      </LoadingProvider>
    );
  }

  return render(ui, { wrapper, ...options });
};
