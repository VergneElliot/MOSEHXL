import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, useMediaQuery } from '@mui/material';
import {
  RestaurantMenu as MenuIcon,
  PointOfSale as POSIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';

// Component imports
import { MenuContainer } from '../Menu';
import POSContainer from '../POS/POSContainer';
import { HistoryContainer } from '../History';
import Settings from '../Settings';
import { LegalComplianceDashboard } from '../Legal';
import { ClosureContainer } from '../Closure';
import { UserManagement, AuditTrailDashboard } from '../Admin';

// Types
import { Category, Product, User } from '../../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  /** Controls whether the tab content can scroll the whole page or uses nested scroll containers */
  scrollMode?: 'auto' | 'hidden';
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, scrollMode = 'auto', ...other } = props;
  const isActive = value === index;
  const isShortScreen = useMediaQuery('(max-height: 900px)');
  return (
    <div
      role="tabpanel"
      hidden={!isActive}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      style={{
        flex: isActive ? 1 : 0,
        minHeight: isActive ? 0 : undefined,
        display: isActive ? 'flex' : 'none',
        flexDirection: 'column',
      }}
      {...other}
    >
      {isActive && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowX: 'hidden',
            overflowY: scrollMode === 'auto' ? 'auto' : 'hidden',
            display: 'flex',
            flexDirection: 'column',
            p: isShortScreen ? 1 : 3,
          }}
        >
          {children}
        </Box>
      )}
    </div>
  );
}

interface AppRouterProps {
  user: User;
  token: string;
  categories: Category[];
  products: Product[];
  isHappyHourActive: boolean;
  timeUntilHappyHour: string;
  onDataUpdate: () => void;
  onHappyHourStatusUpdate: () => void;
}

interface TabConfig {
  label: string;
  icon?: React.ReactElement;
  value: string;
  permission?: string;
  adminOnly?: boolean;
}

const AppRouter: React.FC<AppRouterProps> = ({
  user,
  token,
  categories,
  products,
  isHappyHourActive,
  timeUntilHappyHour,
  onDataUpdate,
  onHappyHourStatusUpdate,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const isShortScreen = useMediaQuery('(max-height: 900px)');

  const TABS: TabConfig[] = [
    { label: 'Caisse', icon: <POSIcon />, value: 'pos', permission: 'access_pos' },
    { label: 'Menu', icon: <MenuIcon />, value: 'menu', permission: 'access_menu' },
    { label: 'Historique', icon: <HistoryIcon />, value: 'history', permission: 'access_history' },
    {
      label: 'Paramètres',
      icon: <SettingsIcon />,
      value: 'settings',
      permission: 'access_settings',
    },
    {
      label: 'Conformité Légale',
      icon: <GavelIcon />,
      value: 'compliance',
      permission: 'access_compliance',
    },
    {
      label: 'Bulletins de Clôture',
      icon: <GavelIcon />,
      value: 'closures',
      permission: 'access_compliance',
    },
    { label: 'Gestion utilisateurs', value: 'user_management', adminOnly: true },
    { label: 'Journal de Sécurité', value: 'audit_trail', adminOnly: true },
  ];

  const filteredTabs = TABS.filter(tab => {
    // Filter out system admin tabs - they should only see business admin tabs
    if (tab.adminOnly) return user?.role === 'establishment_admin';
    if (tab.permission) return user?.permissions?.includes(tab.permission);
    return true;
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Paper
      sx={{
        width: '100%',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="Navigation principale"
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: isShortScreen ? 40 : 48,
          '& .MuiTabs-scrollButtons': {
            color: 'primary.main',
          },
          '& .MuiTab-root': {
            minWidth: { xs: 'auto', sm: 90 },
            fontSize: { xs: isShortScreen ? '0.68rem' : '0.75rem', sm: isShortScreen ? '0.78rem' : '0.875rem' },
            px: { xs: 1, sm: 2 },
            py: { xs: isShortScreen ? 0.75 : 1.5, sm: isShortScreen ? 0.9 : 2 },
            minHeight: isShortScreen ? 40 : 48,
          },
          '& .MuiTab-iconWrapper': {
            fontSize: { xs: isShortScreen ? 14 : 18, sm: isShortScreen ? 16 : 20 },
          },
        }}
      >
        {filteredTabs.map((tab, idx) => (
          <Tab
            key={idx}
            icon={tab.icon}
            iconPosition={tab.icon ? 'start' : undefined}
            label={tab.label}
            sx={{
              textTransform: 'none',
              fontWeight: tabValue === idx ? 600 : 400,
            }}
          />
        ))}
      </Tabs>

      {filteredTabs.map((tab, i) => (
        <TabPanel
          value={tabValue}
          index={i}
          key={tab.value}
          // POS (caisse) has its own nested scroll containers; keep outer panel non-scrollable
          // All other tabs (menu, settings, history, etc.) should be able to scroll vertically
          scrollMode={tab.value === 'pos' ? 'hidden' : 'auto'}
        >
          {tab.value === 'pos' && (
            <POSContainer
              categories={categories}
              products={products}
              isHappyHourActive={isHappyHourActive}
              onDataUpdate={onDataUpdate}
            />
          )}
          {tab.value === 'menu' && (
            <MenuContainer
              categories={categories}
              products={products}
              onDataUpdate={onDataUpdate}
            />
          )}
          {tab.value === 'history' && <HistoryContainer />}
          {tab.value === 'settings' && (
            <Settings
              isHappyHourActive={isHappyHourActive}
              timeUntilHappyHour={timeUntilHappyHour}
              onHappyHourStatusUpdate={onHappyHourStatusUpdate}
              products={products}
            />
          )}
          {tab.value === 'compliance' && <LegalComplianceDashboard />}
          {tab.value === 'closures' && <ClosureContainer />}
          {tab.value === 'user_management' && user?.role === 'establishment_admin' && <UserManagement token={token} />}
          {tab.value === 'audit_trail' && user?.role === 'establishment_admin' && <AuditTrailDashboard token={token} />}
        </TabPanel>
      ))}
    </Paper>
  );
};

export default AppRouter;
