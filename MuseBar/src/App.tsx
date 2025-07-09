import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Tabs,
  Tab,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  LocalBar as BarIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Gavel as GavelIcon
} from '@mui/icons-material';
import { HappyHourService } from './services/happyHourService';
import { DataService } from './services/dataService';
import { Category, Product } from './types';
import MenuManagement from './components/MenuManagement';
import POS from './components/POS';
import HappyHourControl from './components/HappyHourControl';
import Settings from './components/Settings';
import HistoryDashboard from './components/HistoryDashboard';
import LegalComplianceDashboard from './components/LegalComplianceDashboard';
import ClosureBulletinDashboard from './components/ClosureBulletinDashboard';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import AuditTrailDashboard from './components/AuditTrailDashboard';
import { ApiService } from './services/apiService';
import { apiConfig } from './config/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function App() {
  const [tabValue, setTabValue] = useState(0);
  const [isHappyHourActive, setIsHappyHourActive] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [timeUntilHappyHour, setTimeUntilHappyHour] = useState('');

  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
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
        console.log('📡 API configuration initialized:', apiConfig.getConnectionInfo());
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
        // Ensure API config is ready
        if (!apiConfig.isReady()) {
          await apiConfig.initialize();
        }
        
        return fetch(apiConfig.getEndpoint('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` }
        });
      };
      
      checkAuthStatus()
        .then(res => {
          if (!res.ok) {
            throw new Error('Token invalid');
          }
          return res.json();
        })
        .then(data => {
          setUser(data);
          setPermissions(data.permissions || []);
        })
        .catch(() => {
          console.log('Token expired or invalid, logging out');
          handleLogout();
        });
    } else {
      setUser(null);
      setPermissions([]);
    }
  }, [token]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!token || !user) return;

    const refreshInterval = tokenExpiresIn === '7d' ? 
      6 * 24 * 60 * 60 * 1000 : // Refresh every 6 days for 7-day tokens
      10 * 60 * 60 * 1000;      // Refresh every 10 hours for 12-hour tokens

    const intervalId = setInterval(async () => {
      try {
        console.log('Auto-refreshing token...');
        
        // Ensure API config is ready
        if (!apiConfig.isReady()) {
          await apiConfig.initialize();
        }
        
        const response = await fetch(apiConfig.getEndpoint('/api/auth/refresh'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ rememberMe })
        });

        if (response.ok) {
          const data = await response.json();
          setToken(data.token);
          setTokenExpiresIn(data.expiresIn);
          
          // Update localStorage
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('token_expires_in', data.expiresIn);
          
          console.log('Token refreshed successfully');
        } else {
          throw new Error('Failed to refresh token');
        }
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

  // Tab permission mapping
  const TABS = [
    { label: 'Caisse', icon: <RestaurantIcon />, value: 'pos', permission: 'access_pos' },
    { label: 'Gestion Menu', icon: <BarIcon />, value: 'menu', permission: 'access_menu' },
    { label: 'Happy Hour', icon: <ScheduleIcon />, value: 'happy_hour', permission: 'access_happy_hour' },
    { label: 'Historique', icon: <ScheduleIcon />, value: 'history', permission: 'access_history' },
    { label: 'Paramètres', icon: <SettingsIcon />, value: 'settings', permission: 'access_settings' },
    { label: 'Conformité', icon: <GavelIcon />, value: 'compliance', permission: 'access_compliance' },
    { label: 'Bulletins de Clôture', icon: <GavelIcon />, value: 'closures', permission: 'access_compliance' },
    { label: 'Gestion utilisateurs', value: 'user_management', adminOnly: true },
    { label: 'Journal de Sécurité', value: 'audit_trail', adminOnly: true },
  ];

  const filteredTabs = TABS.filter(tab => {
    if (tab.adminOnly) return user?.is_admin;
    if (tab.permission) return user?.permissions?.includes(tab.permission);
    return true;
  });

  useEffect(() => {
    // Mise à jour initiale
    updateData();
    updateHappyHourStatus();

    // Mise à jour toutes les minutes
    const interval = setInterval(() => {
      updateHappyHourStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const updateData = async () => {
    try {
      const [categoriesData, productsData] = await Promise.all([
        dataService.getCategories(),
        dataService.getProducts()
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <BarIcon sx={{ mr: { xs: 1, sm: 2 } }} />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              display: { xs: 'none', sm: 'block' }
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
              display: { xs: 'block', sm: 'none' }
            }}
          >
            MuseBar
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1, sm: 2 },
            flexWrap: 'nowrap',
            overflow: 'hidden'
          }}>
            {isHappyHourActive ? (
              <Chip
                label="HAPPY HOUR ACTIF"
                color="success"
                variant="filled"
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.7rem', sm: '0.875rem' },
                  height: { xs: 24, sm: 32 },
                  '& .MuiChip-label': { px: { xs: 1, sm: 1.5 } }
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
                  display: { xs: timeUntilHappyHour ? 'flex' : 'none', sm: 'flex' }
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
                  maxWidth: { xs: 100, sm: 200 }
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
                  minWidth: { xs: 'auto', sm: 'auto' }
                }}
              >
                {/* Show full text on desktop, icon on mobile */}
                <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Déconnexion
                </Typography>
                <Typography sx={{ display: { xs: 'block', sm: 'none' } }}>
                  Sortir
                </Typography>
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <Paper sx={{ width: '100%' }}>
          {(!token || !user) ? (
            <Login onLogin={handleLogin} />
          ) : (
            <>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="Navigation principale"
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  '& .MuiTabs-scrollButtons': {
                    color: 'primary.main'
                  },
                  '& .MuiTab-root': {
                    minWidth: { xs: 'auto', sm: 90 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 1, sm: 2 },
                    py: { xs: 1.5, sm: 2 }
                  },
                  '& .MuiTab-iconWrapper': {
                    fontSize: { xs: 18, sm: 20 }
                  }
                }}
              >
                {filteredTabs.map((tab, idx) => (
                  <Tab 
                    key={idx} 
                    icon={tab.icon} 
                    label={tab.label}
                    iconPosition="start"
                    sx={{
                      textTransform: 'none',
                      fontWeight: tabValue === idx ? 600 : 400
                    }}
                  />
                ))}
              </Tabs>
              {filteredTabs.map((tab, i) => (
                <TabPanel value={tabValue} index={i} key={tab.value}>
                  {tab.value === 'pos' && <POS categories={categories} products={products} isHappyHourActive={isHappyHourActive} onDataUpdate={updateData} />}
                  {tab.value === 'menu' && <MenuManagement categories={categories} products={products} onDataUpdate={updateData} />}
                  {tab.value === 'happy_hour' && <HappyHourControl isActive={isHappyHourActive} timeUntil={timeUntilHappyHour} onStatusUpdate={updateHappyHourStatus} />}
                  {tab.value === 'history' && <HistoryDashboard />}
                  {tab.value === 'settings' && <Settings />}
                  {tab.value === 'compliance' && <LegalComplianceDashboard />}
                  {tab.value === 'closures' && <ClosureBulletinDashboard />}
                  {tab.value === 'user_management' && user?.is_admin && (
                    <UserManagement token={token} />
                  )}
                  {tab.value === 'audit_trail' && user?.is_admin && (
                    <AuditTrailDashboard token={token} />
                  )}
                </TabPanel>
              ))}
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default App; 