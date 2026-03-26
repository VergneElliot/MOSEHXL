import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import { apiConfig } from './config/api';
import { useAuth } from './hooks/useAuth';
import { useHappyHour } from './hooks/useHappyHour';
import { useDataManagement } from './hooks/useDataManagement';
import AppRouter from './components/common/AppRouter';
import SystemAdminRouter from './components/common/SystemAdminRouter';
import { Login } from './components/auth';
import type { User } from './types';
import InvitationAcceptance from './components/InvitationAcceptance';
import { AppHeader } from './components/common/AppHeader';
import { BusinessSetupWizard } from './components/Setup';
import EstablishmentAccountCreation from './components/EstablishmentAccountCreation';

function App() {
  const {
    user,
    token,
    isAuthenticated,
    login,
    logout,
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

  // Only load POS data for business users, NOT for system admins
  const {
    categories,
    products,
    isLoading,
    error,
    updateData,
  } = useDataManagement(!isSystemAdmin && isAuthenticated);

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

  const handleLogin = (jwt: string, userObj: User, rememberMeFlag: boolean, expiresIn: string) => {
    // Persist auth
    login(jwt, userObj, rememberMeFlag, expiresIn);
    // After login, if not system admin, ensure POS loads fresh data for user's establishment
    // Nothing else here; POS view will load based on isSystemAdmin below
  };

  const handleLogout = () => {
    logout();
  };

  // Show loading state while data is being fetched (only for business users)
  if (!isSystemAdmin && isLoading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <div>Loading...</div>
      </Container>
    );
  }

  // Show error state if data loading failed (only for business users)
  if (!isSystemAdmin && error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <div>Error: {error}</div>
      </Container>
    );
  }

  return (
    <Routes>
      {/* Setup wizard route - no authentication required */}
      <Route path="/setup/:token" element={<BusinessSetupWizard />} />
      
      {/* Establishment account creation route - no authentication required */}
      <Route path="/establishment-setup/:token" element={<EstablishmentAccountCreation />} />
      
      {/* Main application routes */}
      <Route path="/*" element={
        <>
          {!isAuthenticated ? (
            <Container maxWidth="xl" sx={{ mt: 2 }}>
              <Login onLogin={handleLogin} />
              <InvitationAcceptance />
            </Container>
          ) : isSystemAdmin ? (
            // System Admin Interface - Full screen, no container
            <SystemAdminRouter user={user!} />
          ) : (
            // Business Interface - viewport-height chain so tab content can use flex/scroll
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
              <AppHeader
                isHappyHourActive={isHappyHourActive}
                timeUntilHappyHour={timeUntilHappyHour}
                onLogout={handleLogout}
                user={user!}
              />
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
            </Box>
          )}
        </>
      } />
    </Routes>
  );
}

export default App;
