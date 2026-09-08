/**
 * Settings Tabs Component
 * Navigation and tab management for settings sections
 */

import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { Box, Tabs, Tab, Typography, CircularProgress } from '@mui/material';
import {
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  Print as PrintIcon,
  LocalBar as HappyHourIcon,
  AccessTime as HoursIcon,
  Storefront as StorefrontIcon,
  Wifi as WifiIcon,
  RestaurantMenu as MenuIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { SettingsTab } from './types';
import { EstablishmentSettings } from './EstablishmentSettings';
import { ProfileSettings } from './ProfileSettings';
import { OpeningHoursSettingsPanel } from './OpeningHoursSettings';
import { EstablishmentOperatingHoursPanel } from './EstablishmentOperatingHoursSettings';
import { TimeClockNetworkSettings } from './TimeClockNetworkSettings';
import { ClosureSettings } from './ClosureSettings';
import { PrinterSetup } from '../../PrinterSetup';
import { HappyHourControl } from '../../HappyHour';
import { Product, Category } from '../../../types';
import { UseSettingsReturn } from './types';
import { useStepUpAuth } from '../../../contexts/StepUpAuthContext';
import { PERMISSIONS } from '@mosehxl/types';

const LazyMenuContainer = React.lazy(() =>
  import('../../Menu').then((mod) => ({ default: mod.MenuContainer }))
);

interface SettingsTabsProps {
  settingsHook: UseSettingsReturn;
  isHappyHourActive?: boolean;
  timeUntilHappyHour?: string;
  onHappyHourStatusUpdate?: () => void;
  products?: Product[];
  categories?: Category[];
  onDataUpdate?: () => void;
}

/**
 * Tab Panel Component
 */
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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function MenuPanelFallback() {
  return (
    <Box display="flex" justifyContent="center" p={4}>
      <CircularProgress />
    </Box>
  );
}

/**
 * Settings Tabs Component
 */
export const SettingsTabs: React.FC<SettingsTabsProps> = ({
  settingsHook,
  isHappyHourActive = false,
  timeUntilHappyHour = '',
  onHappyHourStatusUpdate = () => {},
  products = [],
  categories = [],
  onDataUpdate = () => {},
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const { ensureAccess, hasAccess } = useStepUpAuth();

  const tabs: SettingsTab[] = useMemo(() => {
    const base: SettingsTab[] = [
      {
        id: 'profile',
        label: 'Profil',
        icon: <PersonIcon />,
        component: <ProfileSettings />,
      },
      {
        id: 'establishment',
        label: "Établissement",
        icon: <BusinessIcon />,
        component: (
          <EstablishmentSettings
            businessInfoProps={{
              businessInfo: settingsHook.state.businessInfo,
              onUpdate: settingsHook.updateBusinessInfo,
              onSave: settingsHook.saveBusinessInfo,
              loading: settingsHook.infoSaving,
              message: settingsHook.infoMessage,
            }}
          />
        ),
      },
      {
        id: 'opening_hours',
        label: 'Plages de réservations',
        icon: <HoursIcon />,
        component: <OpeningHoursSettingsPanel />,
      },
      {
        id: 'operating_hours',
        label: "Horaires d'ouverture",
        icon: <StorefrontIcon />,
        component: <EstablishmentOperatingHoursPanel />,
      },
      {
        id: 'time_clock_network',
        label: 'Pointage',
        icon: <WifiIcon />,
        component: <TimeClockNetworkSettings />,
      },
      {
        id: 'happy_hour',
        label: 'Happy Hour',
        icon: <HappyHourIcon />,
        component: (
          <HappyHourControl
            isActive={isHappyHourActive}
            timeUntil={timeUntilHappyHour}
            onStatusUpdate={onHappyHourStatusUpdate}
            products={products}
          />
        ),
      },
      {
        id: 'closure',
        label: 'Clôture Automatique',
        icon: <ScheduleIcon />,
        component: (
          <ClosureSettings
            closureSettings={settingsHook.state.closureSettings}
            schedulerStatus={settingsHook.state.schedulerStatus}
            onUpdate={settingsHook.updateClosureSettings}
            onSave={settingsHook.saveClosureSettings}
            onTriggerManualCheck={settingsHook.triggerManualCheck}
            loading={settingsHook.saving}
          />
        ),
      },
      {
        id: 'printer',
        label: 'Imprimante',
        icon: <PrintIcon />,
        component: (
          <PrinterSetup embedded />
        ),
      },
    ];

    base.splice(1, 0, {
      id: 'menu',
      label: 'Menu',
      icon: <MenuIcon />,
      component: (
        <Suspense fallback={<MenuPanelFallback />}>
          <LazyMenuContainer
            categories={categories}
            products={products}
            onDataUpdate={onDataUpdate}
            embedded
          />
        </Suspense>
      ),
    });

    return base;
  }, [
    settingsHook,
    isHappyHourActive,
    timeUntilHappyHour,
    onHappyHourStatusUpdate,
    products,
    categories,
    onDataUpdate,
  ]);

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      const tab = tabs[newValue];
      if (!tab) return;
      // Profil is a basic right; every other Paramètres tab is a specific one.
      if (tab.id === 'profile') {
        setCurrentTab(newValue);
        return;
      }
      const required =
        tab.id === 'menu' ? PERMISSIONS.access_menu : PERMISSIONS.access_settings;
      if (hasAccess(required)) {
        setCurrentTab(newValue);
        return;
      }
      void ensureAccess(required, {
        title: tab.id === 'menu' ? 'Gestion du menu' : `Paramètres — ${tab.label}`,
        description:
          tab.id === 'menu'
            ? 'PIN d’un profil autorisé à modifier le catalogue (menu).'
            : `PIN d’un profil autorisé pour ouvrir « ${tab.label} ».`,
      })
        .then(() => setCurrentTab(newValue))
        .catch(() => {
          /* stay on current sub-tab */
        });
    },
    [tabs, ensureAccess, hasAccess]
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Paramètres
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configurez les paramètres de votre établissement
        </Typography>
      </Box>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="settings tabs"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              id={`settings-tab-${index}`}
              aria-controls={`settings-tabpanel-${index}`}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {tabs.map((tab, index) => (
        <TabPanel key={tab.id} value={currentTab} index={index}>
          {tab.component}
        </TabPanel>
      ))}
    </Box>
  );
};

export default SettingsTabs;
