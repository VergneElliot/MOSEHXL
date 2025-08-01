import React, { useEffect } from 'react';
import { Container } from '@mui/material';
import { apiConfig } from './config/api';
import { useAuth } from './hooks/useAuth';
import { useHappyHour } from './hooks/useHappyHour';
import { useDataManagement } from './hooks/useDataManagement';
import AppRouter from './components/common/AppRouter';
import { Login } from './components/Auth';
import InvitationAcceptance from './components/InvitationAcceptance';
import { AppHeader } from './components/common/AppHeader';

function App() {
  const {
    user,
    token,
    isAuthenticated,
    login,
    logout,
  } = useAuth();

  const {
    isHappyHourActive,
    timeUntilHappyHour,
    updateHappyHourStatus,
  } = useHappyHour();

  const {
    categories,
    products,
    isLoading,
    error,
    updateData,
  } = useDataManagement();

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

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <div>Loading...</div>
      </Container>
    );
  }

  // Show error state if data loading failed
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <div>Error: {error}</div>
      </Container>
    );
  }

  return (
    <>
      {isAuthenticated && (
        <AppHeader
          isHappyHourActive={isHappyHourActive}
          timeUntilHappyHour={timeUntilHappyHour}
          onLogout={handleLogout}
          user={user}
        />
      )}
      
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        {!isAuthenticated ? (
          <>
            <Login onLogin={handleLogin} />
            <InvitationAcceptance />
          </>
        ) : (
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
        )}
      </Container>
    </>
  );
}

export default App;
