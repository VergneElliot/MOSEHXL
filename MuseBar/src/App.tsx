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

  const happyHourService = HappyHourService.getInstance();
  const dataService = DataService.getInstance();

  // Auth: check session if token exists
  useEffect(() => {
    ApiService.setToken(token);
    if (token) {
      fetch('http://localhost:3005/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setUser(data);
          setPermissions(data.permissions || []);
        })
        .catch(() => {
          setUser(null);
          setPermissions([]);
          setToken(null);
        });
    } else {
      setUser(null);
      setPermissions([]);
    }
  }, [token]);

  const handleLogin = (jwt: string, userObj: any) => {
    setToken(jwt);
    setUser(userObj);
    // Permissions will be loaded by useEffect
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setPermissions([]);
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
        <Toolbar>
          <BarIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MuseBar - Système de Caisse
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isHappyHourActive ? (
              <Chip
                label="HAPPY HOUR ACTIF"
                color="success"
                variant="filled"
                sx={{ fontWeight: 'bold' }}
              />
            ) : (
              <Chip
                label={`Happy Hour dans ${timeUntilHappyHour}`}
                color="warning"
                variant="outlined"
              />
            )}
            {/* User info and logout */}
            {user && <Chip label={user?.email} color="info" />}
            {user && <Button color="inherit" onClick={handleLogout}>Déconnexion</Button>}
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
                variant="fullWidth"
              >
                {filteredTabs.map((tab, idx) => (
                  <Tab key={idx} icon={tab.icon} label={tab.label} iconPosition="start" />
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