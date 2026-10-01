import React, { Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Box, Container, CircularProgress } from '@mui/material';
import { apiConfig } from './config/api';
import { useAuth } from './hooks/useAuth';
import { useHappyHour } from './hooks/useHappyHour';
import { useDataManagement } from './hooks/useDataManagement';
import { useEstablishmentBrandName } from './hooks/useEstablishmentBrandName';
import AppRouter from './components/common/AppRouter';
import { Login } from './components/auth';
import type { User } from './types';
import { AppHeader } from './components/common/AppHeader';
import { PinSessionsProvider } from './contexts/PinSessionsContext';
import { StepUpAuthProvider } from './contexts/StepUpAuthContext';
import { VisualPrefsProvider } from './contexts/VisualPrefsContext';
import { useTranslation } from 'react-i18next';

const SystemAdminRouter = React.lazy(() => import('./components/common/SystemAdminRouter'));
const BusinessSetupWizard = React.lazy(() =>
  import('./components/Setup').then(mod => ({ default: mod.BusinessSetupWizard }))
);
const EstablishmentAccountCreation = React.lazy(
  () => import('./components/EstablishmentAccountCreation')
);
const PublicReservationPage = React.lazy(
  () => import('./components/Public/PublicReservationPage')
);
const PublicReservationRemindPage = React.lazy(
  () => import('./components/Public/PublicReservationRemindPage')
);
const PublicReservationCancelPage = React.lazy(
  () => import('./components/Public/PublicReservationCancelPage')
);
const PublicShiftConfirmPage = React.lazy(
  () => import('./components/Public/PublicShiftConfirmPage')
);

function RouteFallback() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
      <CircularProgress />
    </Box>
  );
}

/** Guest / setup URLs must never wait on login bootstrap or fall through to Login. */
function isPublicAppPath(pathname: string): boolean {
  return (
    pathname.startsWith('/reserve/') ||
    pathname.startsWith('/planning/confirm/') ||
    pathname.startsWith('/setup/') ||
    pathname.startsWith('/establishment-setup/')
  );
}

function App() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const publicPath = isPublicAppPath(location.pathname);
  const {
    user,
    token,
    isAuthenticated,
    authReady,
    login,
    logout,
    switchEstablishment,
  } = useAuth();

  // Setup routes are handled via dedicated route below

  // Determine interface based on user role
  const isSystemAdmin = user?.role === 'system_admin';

  // Always call hooks (React requirement) but conditionally enable data loading
  const {
    isHappyHourActive,
    timeUntilHappyHour,
    updateHappyHourStatus,
  } = useHappyHour(!isSystemAdmin && isAuthenticated);

  // Catalog requires PIN — do not auto-fetch on JWT alone (avoids 403 storm + rate limits).
  const {
    categories,
    products,
    error,
    updateData,
  } = useDataManagement(false);

  const establishmentBrandName = useEstablishmentBrandName(
    !isSystemAdmin && isAuthenticated,
    user?.establishment_id
  );

  // Initialize API configuration on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await apiConfig.initialize();
      } catch {
        // API config initialization failed — will use fallback URL
      }
    };

    initializeApp();
  }, []);

  const handleLogin = (
    jwt: string,
    userObj: User,
    rememberMeFlag: boolean,
    expiresIn: string,
    refreshExpiresIn?: string
  ) => {
    // Persist auth
    login(jwt, userObj, rememberMeFlag, expiresIn, refreshExpiresIn);
    // After login, if not system admin, ensure POS loads fresh data for user's establishment
    // Nothing else here; POS view will load based on isSystemAdmin below
  };

  const handleLogout = () => {
    logout();
  };

  const handleSwitchEstablishment = async (establishmentId: string, ownerPin: string) => {
    await switchEstablishment(establishmentId, ownerPin);
    // Soft re-login for the venue: reload catalog / happy-hour tenant data.
    await updateData();
    updateHappyHourStatus();
  };

  if (!authReady && !publicPath) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Never unmount the business shell for catalog loading/errors — that tears down
  // PinSessionsProvider, clears the PIN actor header, and storms 403/429 retries.
  // Catalog is loaded after PIN open (AppRouter); surface non-PIN errors inline.

  return (
    <Routes>
      {/* Setup wizard route - no authentication required */}
      <Route path="/setup/:token" element={
        <Suspense fallback={<RouteFallback />}>
          <BusinessSetupWizard />
        </Suspense>
      } />
      
      {/* Establishment account creation route - no authentication required */}
      <Route path="/establishment-setup/:token" element={
        <Suspense fallback={<RouteFallback />}>
          <EstablishmentAccountCreation />
        </Suspense>
      } />

      <Route path="/reserve/:slug/relancer/:token" element={
        <Suspense fallback={<RouteFallback />}>
          <PublicReservationRemindPage />
        </Suspense>
      } />
      <Route path="/reserve/:slug/annuler/:token" element={
        <Suspense fallback={<RouteFallback />}>
          <PublicReservationCancelPage />
        </Suspense>
      } />
      <Route path="/reserve/:slug" element={
        <Suspense fallback={<RouteFallback />}>
          <PublicReservationPage />
        </Suspense>
      } />

      <Route path="/planning/confirm/:token" element={
        <Suspense fallback={<RouteFallback />}>
          <PublicShiftConfirmPage />
        </Suspense>
      } />
      
      {/* Main application routes */}
      <Route path="/*" element={
        <>
          {!isAuthenticated ? (
            <Container maxWidth="xl" sx={{ mt: 2 }}>
              <Login onLogin={handleLogin} />
            </Container>
          ) : isSystemAdmin ? (
            <Suspense fallback={<RouteFallback />}>
              <SystemAdminRouter user={user!} />
            </Suspense>
          ) : (
            // Business Interface - viewport-height chain so tab content can use flex/scroll
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
              <PinSessionsProvider>
                <VisualPrefsProvider>
                <StepUpAuthProvider>
                <AppHeader
                  isHappyHourActive={isHappyHourActive}
                  timeUntilHappyHour={timeUntilHappyHour}
                  onLogout={handleLogout}
                  user={user!}
                  onSwitchEstablishment={handleSwitchEstablishment}
                  showPinSessions
                  onHappyHourStatusUpdate={updateHappyHourStatus}
                  establishmentBrandName={establishmentBrandName}
                />
                {error && (
                  <Box sx={{ px: 2, pt: 1 }}>
                    <div>
                      {t('errorPrefix')} {error}
                    </div>
                  </Box>
                )}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    mt: 0,
                    px: 0,
                  }}
                >
                  <AppRouter
                    user={user!}
                    token={token!}
                    categories={categories}
                    products={products}
                    isHappyHourActive={isHappyHourActive}
                    timeUntilHappyHour={timeUntilHappyHour}
                    onDataUpdate={updateData}
                    onHappyHourStatusUpdate={updateHappyHourStatus}
                  />
                </Box>
                </StepUpAuthProvider>
                </VisualPrefsProvider>
              </PinSessionsProvider>
            </Box>
          )}
        </>
      } />
    </Routes>
  );
}

export default App;
