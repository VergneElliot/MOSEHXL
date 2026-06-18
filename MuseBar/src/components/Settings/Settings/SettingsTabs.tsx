/**
 * Settings Tabs Component
 * Navigation and tab management for settings sections
 */

import React, { useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import {
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  Print as PrintIcon,
  LocalBar as HappyHourIcon,
} from '@mui/icons-material';
import { SettingsTab } from './types';
import { EstablishmentSettings } from './EstablishmentSettings';
import { ClosureSettings } from './ClosureSettings';
import { PrinterSetup } from '../../PrinterSetup';
import { HappyHourControl } from '../../HappyHour';

import { Product } from '../../../types';
import { UseSettingsReturn } from './types';

interface SettingsTabsProps {
  settingsHook: UseSettingsReturn;
  isHappyHourActive?: boolean;
  timeUntilHappyHour?: string;
  onHappyHourStatusUpdate?: () => void;
  products?: Product[];
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

/**
 * Settings Tabs Component
 */
export const SettingsTabs: React.FC<SettingsTabsProps> = ({
  settingsHook,
  isHappyHourActive = false,
  timeUntilHappyHour = '',
  onHappyHourStatusUpdate = () => {},
  products = [],
}) => {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const tabs: SettingsTab[] = [
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
          generalSettingsProps={{
            settings: settingsHook.state.generalSettings,
            onUpdate: settingsHook.updateGeneralSettings,
            onSave: settingsHook.saveGeneralSettings,
            loading: settingsHook.saving,
          }}
        />
      ),
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

