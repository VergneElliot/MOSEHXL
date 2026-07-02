import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { Box, Tabs, Tab, Paper, useTheme, useMediaQuery } from '@mui/material';
import {
  RestaurantMenu as MenuIcon,
  PointOfSale as POSIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';

import POSContainer from '../POS/POSContainer';
import {
  LazyAuditTrailDashboard,
  LazyClosureContainer,
  LazyHistoryContainer,
  LazyLegalComplianceDashboard,
  LazyMenuContainer,
  LazySettings,
  LazyUserManagement,
  TabPanelFallback,
} from './appLazyTabPanels';

import { Category, Product, User } from '../../types';
import { PERMISSIONS, type PermissionName } from '@mosehxl/types';

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
            p: scrollMode === 'hidden' ? 1 : 3,
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
  /** If set, user must have this permission (establishment admin always has all, server-side). */
  permission?: PermissionName;
  /** Only establishment_admin (e.g. security journal). */
  adminOnly?: boolean;
  /** Tab visible to any logged-in establishment user (e.g. Historique). */
  establishmentWide?: boolean;
  /** Visible to establishment_admin even without explicit permission (production explicit_only mode). */
  establishmentAdminAlways?: boolean;
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
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const posLinePermissions = useMemo(
    () => ({
      happyHourManual: user.permissions?.includes(PERMISSIONS.pos_happyhour_manual) ?? false,
      offert: user.permissions?.includes(PERMISSIONS.pos_apply_offert) ?? false,
      perso: user.permissions?.includes(PERMISSIONS.pos_apply_perso) ?? false,
    }),
    [user.permissions]
  );

  const TABS: TabConfig[] = [
    { label: 'Caisse', icon: <POSIcon />, value: 'pos', permission: PERMISSIONS.access_pos },
    { label: 'Menu', icon: <MenuIcon />, value: 'menu', permission: PERMISSIONS.access_menu },
    { label: 'Historique', icon: <HistoryIcon />, value: 'history', establishmentWide: true },
    {
      label: 'Paramètres',
      icon: <SettingsIcon />,
      value: 'settings',
      permission: PERMISSIONS.access_settings,
    },
    {
      label: 'Conformité Légale',
      icon: <GavelIcon />,
      value: 'compliance',
      permission: PERMISSIONS.access_compliance,
      establishmentAdminAlways: true,
    },
    {
      label: 'Bulletins de Clôture',
      icon: <GavelIcon />,
      value: 'closures',
      permission: PERMISSIONS.access_closure,
    },
    { label: 'Gestion utilisateurs', value: 'user_management', permission: PERMISSIONS.access_user_management },
    { label: 'Journal de Sécurité', value: 'audit_trail', adminOnly: true },
  ];

  const filteredTabs = TABS.filter(tab => {
    if (tab.adminOnly) return user?.role === 'establishment_admin';
    if (tab.establishmentWide) {
      return !!user?.establishment_id;
    }
    if (tab.establishmentAdminAlways && user?.role === 'establishment_admin') {
      return true;
    }
    if (tab.value === 'user_management') {
      return (
        user?.role === 'establishment_admin' ||
        (user?.permissions?.includes(PERMISSIONS.access_user_management) ?? false)
      );
    }
    if (tab.permission) return user?.permissions?.includes(tab.permission) ?? false;
    return true;
  });

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  return (
    <Paper
      sx={{
        width: '100%',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        overflow: 'hidden',
      }}
    >
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="Navigation principale"
        orientation={isDesktop ? 'vertical' : 'horizontal'}
        variant={isDesktop ? 'standard' : 'scrollable'}
        scrollButtons={isDesktop ? false : 'auto'}
        allowScrollButtonsMobile={!isDesktop}
        sx={{
          borderRight: { md: 1 },
          borderBottom: { xs: 1, md: 0 },
          borderColor: 'divider',
          minWidth: { md: 220 },
          width: { xs: '100%', md: 220 },
          flexShrink: 0,
          '& .MuiTabs-scrollButtons': {
            color: 'primary.main',
          },
          '& .MuiTabs-flexContainer': {
            alignItems: { md: 'stretch' },
          },
          '& .MuiTab-root': {
            minWidth: { xs: 'auto', md: 200 },
            fontSize: { xs: '1.1rem', sm: '1.3rem', md: '1.68rem' },
            px: { xs: 1, sm: 2 },
            py: { xs: 1.75, sm: 2.25 },
            justifyContent: { md: 'flex-start' },
            alignItems: { md: 'flex-start' },
            textAlign: { md: 'left' },
          },
          '& .MuiTab-iconWrapper': {
            fontSize: { xs: 24, sm: 28 },
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
              alignItems: { md: 'flex-start' },
            }}
          />
        ))}
      </Tabs>

      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {filteredTabs.map((tab, i) => (
          <TabPanel
            value={tabValue}
            index={i}
            key={tab.value}
            scrollMode={tab.value === 'pos' ? 'hidden' : 'auto'}
          >
            {tab.value === 'pos' && (
              <POSContainer
                categories={categories}
                products={products}
                isHappyHourActive={isHappyHourActive}
                onDataUpdate={onDataUpdate}
                posLinePermissions={posLinePermissions}
              />
            )}
            {tab.value === 'menu' && (
              <Suspense fallback={<TabPanelFallback />}>
                <LazyMenuContainer
                  categories={categories}
                  products={products}
                  onDataUpdate={onDataUpdate}
                />
              </Suspense>
            )}
            {tab.value === 'history' && (
              <Suspense fallback={<TabPanelFallback />}>
                <LazyHistoryContainer
                  canCancelOrReturn={user?.permissions?.includes(PERMISSIONS.orders_cancel) ?? false}
                />
              </Suspense>
            )}
            {tab.value === 'settings' && (
              <Suspense fallback={<TabPanelFallback />}>
                <LazySettings
                  isHappyHourActive={isHappyHourActive}
                  timeUntilHappyHour={timeUntilHappyHour}
                  onHappyHourStatusUpdate={onHappyHourStatusUpdate}
                  products={products}
                />
              </Suspense>
            )}
            {tab.value === 'compliance' && (
              <Suspense fallback={<TabPanelFallback />}>
                <LazyLegalComplianceDashboard />
              </Suspense>
            )}
            {tab.value === 'closures' && (
              <Suspense fallback={<TabPanelFallback />}>
                <LazyClosureContainer />
              </Suspense>
            )}
            {tab.value === 'user_management' &&
              (user?.role === 'establishment_admin' ||
                user?.permissions?.includes(PERMISSIONS.access_user_management)) && (
                <Suspense fallback={<TabPanelFallback />}>
                  <LazyUserManagement token={token} />
                </Suspense>
              )}
            {tab.value === 'audit_trail' && user?.role === 'establishment_admin' && (
              <Suspense fallback={<TabPanelFallback />}>
                <LazyAuditTrailDashboard token={token} />
              </Suspense>
            )}
          </TabPanel>
        ))}
      </Box>
    </Paper>
  );
};

export default AppRouter;
