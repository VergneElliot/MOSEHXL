import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import { initializeClientErrorLogging } from './services/clientErrorLogger';
import { createAppTheme } from './theme/createAppTheme';
import './i18n';

/** Default before a PIN session loads prefs (dark is the product default). */
const bootTheme = createAppTheme('dark');

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

initializeClientErrorLogging();

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={bootTheme}>
        <CssBaseline />
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
