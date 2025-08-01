import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Container } from '@mui/material';
import { apiConfig } from './config/api';
import { useAuth } from './hooks/useAuth';
import { useHappyHour } from './hooks/useHappyHour';
import { useDataManagement } from './hooks/useDataManagement';
import AppRouter from './components/common/AppRouter';
import SystemAdminRouter from './components/common/SystemAdminRouter';
import { Login } from './components/Auth';
import InvitationAcceptance from './components/InvitationAcceptance';
import { AppHeader } from './components/common/AppHeader';
import { BusinessSetupWizard } from './components/Setup';

function App() {
  const location = useLocation();
  const {
    user,
    token,
    isAuthenticated,
    login,
    logout,
  } = useAuth();

  // Check if this is a setup route (no authentication required)
  const isSetupRoute = location.pathname.startsWith('/setup/');

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
      } catch (error) {
        // Log error but don't break app initialization
        // Error will be handled by error boundary if needed
        console.error('Failed to initialize API configuration:', error);
      }
    };

    initializeApp();
  }, []);

  const handleLogin = (jwt: string, userObj: any, rememberMeFlag: boolean, expiresIn: string) => {
    login(jwt, userObj, rememberMeFlag, expiresIn);
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
            <SystemAdminRouter user={user} />
          ) : (
            // Business Interface - Traditional layout
            <>
              <AppHeader
                isHappyHourActive={isHappyHourActive}
                timeUntilHappyHour={timeUntilHappyHour}
                onLogout={handleLogout}
                user={user}
              />
              <Container maxWidth="xl" sx={{ mt: 2 }}>
                <AppRouter
                  user={user}
                  token={token!}
                  categories={categories}
                  products={products}
                  isHappyHourActive={isHappyHourActive}
                  timeUntilHappyHour={timeUntilHappyHour}
                  onDataUpdate={updateData}
                  onHappyHourStatusUpdate={updateHappyHourStatus}
                />
              </Container>
            </>
          )}
        </>
      } />
    </Routes>
  );
}

export default App;
