import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import {
  RestaurantMenu as MenuIcon,
  PointOfSale as POSIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';

// Component imports
import { MenuContainer } from '../Menu';
import POSContainer from '../POS/POSContainer';
import { HappyHourControl } from '../HappyHour';
import { HistoryContainer } from '../History';
import Settings from '../Settings';
import { LegalComplianceDashboard } from '../Legal';
import { ClosureContainer } from '../Closure';
import { UserManagement, AuditTrailDashboard } from '../Admin';

// Types
import { Category, Product } from '../../types';

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

interface AppRouterProps {
  user: any;
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

  const TABS: TabConfig[] = [
    { label: 'Caisse', icon: <POSIcon />, value: 'pos', permission: 'access_pos' },
    { label: 'Menu', icon: <MenuIcon />, value: 'menu', permission: 'access_menu' },
    {
      label: 'Happy Hour',
      icon: <ScheduleIcon />,
      value: 'happy_hour',
      permission: 'access_happy_hour',
    },
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
    if (tab.adminOnly) return user?.is_admin && user?.role !== 'system_admin';
    if (tab.permission) return user?.permissions?.includes(tab.permission);
    return true;
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Paper sx={{ width: '100%' }}>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="Navigation principale"
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          '& .MuiTabs-scrollButtons': {
            color: 'primary.main',
          },
          '& .MuiTab-root': {
            minWidth: { xs: 'auto', sm: 90 },
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            px: { xs: 1, sm: 2 },
            py: { xs: 1.5, sm: 2 },
          },
          '& .MuiTab-iconWrapper': {
            fontSize: { xs: 18, sm: 20 },
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
        <TabPanel value={tabValue} index={i} key={tab.value}>
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
          {tab.value === 'happy_hour' && (
            <HappyHourControl
              isActive={isHappyHourActive}
              timeUntil={timeUntilHappyHour}
              onStatusUpdate={onHappyHourStatusUpdate}
            />
          )}
          {tab.value === 'history' && <HistoryContainer />}
          {tab.value === 'settings' && <Settings />}
          {tab.value === 'compliance' && <LegalComplianceDashboard />}
          {tab.value === 'closures' && <ClosureContainer />}
          {tab.value === 'user_management' && user?.is_admin && <UserManagement token={token} />}
          {tab.value === 'audit_trail' && user?.is_admin && <AuditTrailDashboard token={token} />}
        </TabPanel>
      ))}
    </Paper>
  );
};

export default AppRouter;
