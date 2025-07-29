import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Container, Box, Chip, Button } from '@mui/material';
import { Restaurant as RestaurantIcon } from '@mui/icons-material';
import { HappyHourService } from './services/happyHourService';
import { DataService } from './services/dataService';
import { Category, Product } from './types';
import AppRouter from './components/common/AppRouter';
import { Login } from './components/Auth';
import { apiService, ApiService } from './services/apiService';
import { apiConfig } from './config/api';

// TabPanel logic moved to AppRouter

function App() {
  const [isHappyHourActive, setIsHappyHourActive] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [timeUntilHappyHour, setTimeUntilHappyHour] = useState('');

  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [, setPermissions] = useState<string[]>([]);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [tokenExpiresIn, setTokenExpiresIn] = useState<string>('12h');

  const happyHourService = HappyHourService.getInstance();
  const dataService = DataService.getInstance();

  // Initialize API configuration and load token from localStorage on app start
  useEffect(() => {
    const initializeApp = async () => {
      // Initialize API configuration first
      try {
        await apiConfig.initialize();
        // API configuration initialized
      } catch (error) {
        console.error('❌ Failed to initialize API configuration:', error);
      }

      // Load stored authentication data
      const storedToken = localStorage.getItem('auth_token');
      const storedRememberMe = localStorage.getItem('remember_me') === 'true';
      const storedExpiresIn = localStorage.getItem('token_expires_in') || '12h';

      if (storedToken) {
        setToken(storedToken);
        setRememberMe(storedRememberMe);
        setTokenExpiresIn(storedExpiresIn);
      }
    };

    initializeApp();
  }, []);

  // Auth: check session if token exists
  useEffect(() => {
    ApiService.setToken(token);
    if (token) {
      const checkAuthStatus = async () => {
        try {
          // Ensure API config is ready
          if (!apiConfig.isReady()) {
            await apiConfig.initialize();
          }

          const response = await apiService.get<any>('/auth/me');
          const data = response.data;
          setUser(data);
          setPermissions(data.permissions || []);
        } catch (error) {
          // Token expired, logout required
          handleLogout();
        }
      };

      checkAuthStatus();
    } else {
      setUser(null);
      setPermissions([]);
    }
  }, [token]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!token || !user) return;

    const refreshInterval =
      tokenExpiresIn === '7d'
        ? 6 * 24 * 60 * 60 * 1000 // Refresh every 6 days for 7-day tokens
        : 10 * 60 * 60 * 1000; // Refresh every 10 hours for 12-hour tokens

    const intervalId = setInterval(async () => {
      try {
        // Auto-refreshing token

        // Ensure API config is ready
        if (!apiConfig.isReady()) {
          await apiConfig.initialize();
        }

        const response = await apiService.post<any>('/auth/refresh', { rememberMe });
        const data = response.data;
        setToken(data.token);
        setTokenExpiresIn(data.expiresIn);

        // Update localStorage
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('token_expires_in', data.expiresIn);

        // Token refreshed successfully
      } catch (error) {
        console.error('Token refresh failed:', error);
        handleLogout();
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [token, user, rememberMe, tokenExpiresIn]);

  const handleLogin = (jwt: string, userObj: any, rememberMeFlag: boolean, expiresIn: string) => {
    setToken(jwt);
    setUser(userObj);
    setRememberMe(rememberMeFlag);
    setTokenExpiresIn(expiresIn);

    // Store in localStorage
    localStorage.setItem('auth_token', jwt);
    localStorage.setItem('remember_me', rememberMeFlag.toString());
    localStorage.setItem('token_expires_in', expiresIn);

    // Permissions will be loaded by useEffect
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setPermissions([]);
    setRememberMe(false);
    setTokenExpiresIn('12h');

    // Clear localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('remember_me');
    localStorage.removeItem('token_expires_in');
  };

  // Tab logic moved to AppRouter component

  useEffect(() => {
    // Mise à jour initiale
    updateData();
    updateHappyHourStatus();

    // Mise à jour toutes les minutes
    const interval = setInterval(() => {
      updateHappyHourStatus();
    }, 60000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateData = async () => {
    try {
      const [categoriesData, productsData] = await Promise.all([
        dataService.getCategories(),
        dataService.getProducts(),
      ]);
      setCategories(categoriesData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to update data:', error);
      // Fallback to sync methods
      setCategories(dataService.getCategoriesSync());
      setProducts(dataService.getProductsSync());
    }
  };

  const updateHappyHourStatus = () => {
    setIsHappyHourActive(happyHourService.isHappyHourActive());
    setTimeUntilHappyHour(happyHourService.getTimeUntilHappyHour());
  };

  // Tab change handler moved to AppRouter component

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <RestaurantIcon sx={{ mr: { xs: 1, sm: 2 } }} />
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            MuseBar - Système de Caisse
          </Typography>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontSize: '1rem',
              display: { xs: 'block', sm: 'none' },
            }}
          >
            MuseBar
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              flexWrap: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {isHappyHourActive ? (
              <Chip
                label="HAPPY HOUR ACTIF"
                color="success"
                variant="filled"
                sx={{
                  fontWeight: 'bold',
                  fontSize: { xs: '0.7rem', sm: '0.875rem' },
                  height: { xs: 24, sm: 32 },
                  '& .MuiChip-label': { px: { xs: 1, sm: 1.5 } },
                }}
              />
            ) : (
              <Chip
                label={`HH ${timeUntilHappyHour}`}
                color="warning"
                variant="outlined"
                sx={{
                  fontSize: { xs: '0.7rem', sm: '0.875rem' },
                  height: { xs: 24, sm: 32 },
                  '& .MuiChip-label': { px: { xs: 1, sm: 1.5 } },
                  display: { xs: timeUntilHappyHour ? 'flex' : 'none', sm: 'flex' },
                }}
              />
            )}
            {/* User info and logout */}
            {user && (
              <Chip
                label={user?.email?.split('@')[0] || user?.email}
                color="info"
                sx={{
                  fontSize: { xs: '0.7rem', sm: '0.875rem' },
                  height: { xs: 24, sm: 32 },
                  '& .MuiChip-label': { px: { xs: 1, sm: 1.5 } },
                  maxWidth: { xs: 100, sm: 200 },
                }}
              />
            )}
            {user && (
              <Button
                color="inherit"
                onClick={handleLogout}
                sx={{
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  px: { xs: 1, sm: 2 },
                  py: { xs: 0.5, sm: 1 },
                  minWidth: { xs: 'auto', sm: 'auto' },
                }}
              >
                {/* Show full text on desktop, icon on mobile */}
                <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>Déconnexion</Typography>
                <Typography sx={{ display: { xs: 'block', sm: 'none' } }}>Sortir</Typography>
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 3 }}>
        {!token || !user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <AppRouter
            user={user}
            token={token}
            categories={categories}
            products={products}
            isHappyHourActive={isHappyHourActive}
            timeUntilHappyHour={timeUntilHappyHour}
            onDataUpdate={updateData}
            onHappyHourStatusUpdate={updateHappyHourStatus}
          />
        )}
      </Container>
    </Box>
  );
}

export default App;
