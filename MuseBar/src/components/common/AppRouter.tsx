import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Paper } from '@mui/material';
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
  LazyFloorPlanTabContainer,
  LazyHistoryContainer,
  LazySettings,
  TabPanelFallback,
} from './appLazyTabPanels';
import { AppMainNav } from './AppMainNav';

import { Category, Product, User } from '../../types';
import { PERMISSIONS, type PermissionName } from '@mosehxl/types';
import { useStepUpAuth } from '../../contexts/StepUpAuthContext';
import { usePinSessions } from '../../contexts/PinSessionsContext';
import { canEnterWithoutStepUpPin } from '../../contexts/stepUpPageEntryPolicy';
import { NavSubsectionsProvider } from '../../contexts/NavSubsectionsContext';

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
  onDataUpdate: () => void | Promise<void | boolean>;
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
  PERMISSIONS.access_compliance,
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
  const [navOpen, setNavOpen] = useState(false);
  const { ensureAccess, ensureSession, releaseAccess, releaseAllAccess } = useStepUpAuth();
  const { activeSession, activeSessionId } = usePinSessions();

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
   * Feature tabs require an active PIN session. Empty permission lists are basic
   * (session enough). Specific lists always step-up via ensureAccess — never skip
   * because the focused badge already holds the right (see canEnterWithoutStepUpPin).
   */
  const selectTab = useCallback(
    (newValue: number) => {
      const tab = filteredTabs[newValue];
      if (!tab) return;
      const required = TAB_ENTRY_PERMISSIONS[tab.value] ?? [];

      if (canEnterWithoutStepUpPin(required)) {
        if (activeSession) {
          setTabValue(newValue);
          return;
        }
        void ensureAccess([PERMISSIONS.access_pos], {
          title: 'Ouvrir une session PIN',
          description:
            'Connectez un badge PIN pour accéder aux fonctionnalités. Le compte email n’accorde aucun droit seul.',
        })
          .then(() => setTabValue(newValue))
          .catch(() => undefined);
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
    [filteredTabs, ensureAccess, activeSession]
  );

  // Leaving a gated page ends the authorization the PIN gave for it.
  const activeTabKey = filteredTabs[tabValue]?.value ?? '';
  useEffect(() => {
    const keep = new Set(TAB_ENTRY_PERMISSIONS[activeTabKey] ?? []);
    for (const permission of GATED_TAB_PERMISSIONS) {
      if (!keep.has(permission)) releaseAccess(permission);
    }
  }, [activeTabKey, releaseAccess]);

  // Switching (or closing) the active badge always returns to Caisse — never keep a
  // previous session's gated tab open under another identity.
  const lastSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    const id = activeSessionId;
    if (lastSessionIdRef.current !== null && lastSessionIdRef.current !== id) {
      switchToPosTab();
      releaseAllAccess();
    }
    lastSessionIdRef.current = id;
  }, [activeSessionId, releaseAllAccess, switchToPosTab]);

  useEffect(() => {
    if (!activeSession) switchToPosTab();
  }, [activeSession, switchToPosTab]);

  // Catalog loads once per PIN session id (APIs are PIN-gated).
  const catalogLoadedForSession = useRef<string | null>(null);
  useEffect(() => {
    const sessionId = activeSession?.id ?? null;
    if (!sessionId) {
      catalogLoadedForSession.current = null;
      return;
    }
    if (catalogLoadedForSession.current === sessionId) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async (attempt: number) => {
      const ok = await onDataUpdate();
      if (cancelled) return;
      if (ok) {
        catalogLoadedForSession.current = sessionId;
        return;
      }
      // Token may not be registered yet, or a parallel load briefly failed — retry a few times.
      if (attempt < 4) {
        retryTimer = setTimeout(() => {
          void load(attempt + 1);
        }, 150 * (attempt + 1));
      }
    };

    void load(0);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [activeSession?.id, onDataUpdate]);

  // Remember-me JWT alone: open the PIN pad once so the user is not stuck.
  const autoPinPrompted = useRef(false);
  useEffect(() => {
    if (!user?.establishment_id || activeSession || autoPinPrompted.current) return;
    autoPinPrompted.current = true;
    void ensureSession({
      message:
        'Connectez un badge PIN pour accéder à l’application. Le compte email n’accorde aucun droit seul.',
    }).catch(() => undefined);
  }, [user?.establishment_id, activeSession, ensureSession]);

  if (user?.establishment_id && !activeSession) {
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
        <AppMainNav
          tabs={filteredTabs}
          activeIndex={Math.max(0, posTabIndex)}
          open={navOpen}
          onOpen={() => setNavOpen(true)}
          onClose={() => setNavOpen(false)}
          onSelect={selectTab}
          showPinSessions
        />
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
          }}
        >
          <Box sx={{ maxWidth: 480, textAlign: 'center' }}>
            <Box sx={{ typography: 'h5', mb: 1, fontWeight: 600 }}>Ouvrez une session PIN</Box>
            <Box sx={{ typography: 'body1', color: 'text.secondary', mb: 2 }}>
              Le compte email ne donne aucun droit. Utilisez « Session » dans la barre ci-dessus
              pour ouvrir un badge, ou déconnectez-vous (en-tête) si ce n’est pas votre poste.
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <NavSubsectionsProvider>
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
        <AppMainNav
          tabs={filteredTabs}
          activeIndex={tabValue}
          open={navOpen}
          onOpen={() => setNavOpen(true)}
          onClose={() => setNavOpen(false)}
          onSelect={selectTab}
          showPinSessions
        />

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
                  <LazyFloorPlanTabContainer onSwitchToPos={switchToPosTab} />
                </Suspense>
              )}
              {tab.value === 'history' && (
                <Suspense fallback={<TabPanelFallback />}>
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
                    token={token}
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
    </NavSubsectionsProvider>
  );
};

export default AppRouter;
