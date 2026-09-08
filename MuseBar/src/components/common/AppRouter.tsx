import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Tabs, Tab, Paper, useTheme, useMediaQuery } from '@mui/material';
import {
  PointOfSale as POSIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Gavel as GavelIcon,
  BusinessCenter as AdminIcon,
  TableRestaurant as FloorIcon,
} from '@mui/icons-material';

import POSContainer from '../POS/POSContainer';
import {
  LazyAdministrationContainer,
  LazyClosureContainer,
  LazyFloorPlanConsultPanel,
  LazyHistoryContainer,
  LazySettings,
  TabPanelFallback,
} from './appLazyTabPanels';

import { Category, Product, User } from '../../types';
import { PERMISSIONS, type PermissionName } from '@mosehxl/types';
import { useStepUpAuth } from '../../contexts/StepUpAuthContext';
import { usePinSessions } from '../../contexts/PinSessionsContext';

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

/** Any one of these permissions opens the Administration space. */
const ADMINISTRATION_PERMISSIONS: PermissionName[] = [
  PERMISSIONS.access_documents,
  PERMISSIONS.access_inbox,
  PERMISSIONS.access_reservations,
  PERMISSIONS.access_planning,
  PERMISSIONS.access_user_management,
  PERMISSIONS.manage_floor_plan,
];

/**
 * Specific permissions gating each tab. Every tab stays visible: entering one whose permission
 * the acting identity lacks asks for a PIN instead of being hidden or greyed out. An empty list
 * means the tab is part of the basic tier — Paramètres is listed because its Profil tab is
 * basic, while its other tabs are gated inside the page.
 */
const TAB_ENTRY_PERMISSIONS: Record<string, PermissionName[]> = {
  pos: [],
  floor_plan: [],
  history: [],
  settings: [],
  closures: [PERMISSIONS.access_closure],
  administration: ADMINISTRATION_PERMISSIONS,
};

const GATED_TAB_PERMISSIONS = Array.from(
  new Set(Object.values(TAB_ENTRY_PERMISSIONS).flat())
);

interface TabConfig {
  label: string;
  icon?: React.ReactElement;
  value: string;
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
  const { ensureAccess, hasAccess, releaseAccess } = useStepUpAuth();
  const { activeSession } = usePinSessions();

  const TABS: TabConfig[] = [
    { label: 'Caisse', icon: <POSIcon />, value: 'pos' },
    { label: 'Plan de salle', icon: <FloorIcon />, value: 'floor_plan' },
    { label: 'Historique', icon: <HistoryIcon />, value: 'history' },
    { label: 'Paramètres', icon: <SettingsIcon />, value: 'settings' },
    { label: 'Bulletins de Clôture', icon: <GavelIcon />, value: 'closures' },
    { label: 'Administration', icon: <AdminIcon />, value: 'administration' },
  ];

  // Every tab is shown to every member: gated ones ask for a PIN on entry.
  const filteredTabs = TABS.filter(() => Boolean(user?.establishment_id));

  const posTabIndex = useMemo(
    () => filteredTabs.findIndex((tab) => tab.value === 'pos'),
    [filteredTabs]
  );

  const switchToPosTab = useCallback(() => {
    if (posTabIndex >= 0) setTabValue(posTabIndex);
  }, [posTabIndex]);

  /**
   * A PIN session is the acting identity when one is open, so its rights govern and the
   * account's own grants are not enough. Without any session, the logged-in account acts
   * for itself.
   */
  const canEnter = useCallback(
    (permissions: PermissionName[]): boolean => {
      if (permissions.length === 0) return true;
      if (activeSession) return hasAccess(permissions);
      return permissions.some((p) => user?.permissions?.includes(p) ?? false);
    },
    [activeSession, hasAccess, user?.permissions]
  );

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      const tab = filteredTabs[newValue];
      if (!tab) return;
      const required = TAB_ENTRY_PERMISSIONS[tab.value] ?? [];
      if (canEnter(required)) {
        setTabValue(newValue);
        return;
      }
      void ensureAccess(required, {
        title: `Accès — ${tab.label}`,
        description: `PIN d’un profil autorisé pour ouvrir « ${tab.label} ».`,
      })
        .then(() => setTabValue(newValue))
        .catch(() => {
          /* stay on current tab */
        });
    },
    [filteredTabs, canEnter, ensureAccess]
  );

  // Leaving a gated page ends the authorization the PIN gave for it.
  const activeTabKey = filteredTabs[tabValue]?.value ?? '';
  useEffect(() => {
    const keep = new Set(TAB_ENTRY_PERMISSIONS[activeTabKey] ?? []);
    for (const permission of GATED_TAB_PERMISSIONS) {
      if (!keep.has(permission)) releaseAccess(permission);
    }
  }, [activeTabKey, releaseAccess]);

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
            scrollMode={tab.value === 'pos' || tab.value === 'floor_plan' ? 'hidden' : 'auto'}
          >
            {tab.value === 'pos' && (
              <POSContainer
                categories={categories}
                products={products}
                isHappyHourActive={isHappyHourActive}
                onDataUpdate={onDataUpdate}
              />
            )}
            {tab.value === 'floor_plan' && (
              <Suspense fallback={<TabPanelFallback />}>
                <LazyFloorPlanConsultPanel onSwitchToPos={switchToPosTab} />
              </Suspense>
            )}
            {tab.value === 'history' && (
              <Suspense fallback={<TabPanelFallback />}>
                {/* Cancellation is offered to everyone and asks for a PIN when needed. */}
                <LazyHistoryContainer canCancelOrReturn />
              </Suspense>
            )}
            {tab.value === 'settings' && (
              <Suspense fallback={<TabPanelFallback />}>
                <LazySettings
                  isHappyHourActive={isHappyHourActive}
                  timeUntilHappyHour={timeUntilHappyHour}
                  onHappyHourStatusUpdate={onHappyHourStatusUpdate}
                  products={products}
                  categories={categories}
                  onDataUpdate={onDataUpdate}
                />
              </Suspense>
            )}
            {tab.value === 'closures' && (
              <Suspense fallback={<TabPanelFallback />}>
                <LazyClosureContainer />
              </Suspense>
            )}
            {tab.value === 'administration' && (
              <Suspense fallback={<TabPanelFallback />}>
                <LazyAdministrationContainer user={user} token={token} />
              </Suspense>
            )}
          </TabPanel>
        ))}
      </Box>
    </Paper>
  );
};

export default AppRouter;
