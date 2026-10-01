/**
 * Plan de salle top-level tab: service (consult) + layout editor sub-tabs.
 */

import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { Box, CircularProgress, Tab, Tabs } from '@mui/material';
import {
  TableRestaurant as ServiceIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { PERMISSIONS } from '@mosehxl/types';
import { useStepUpAuth } from '../../contexts/StepUpAuthContext';
import {
  useRegisterNavSubsections,
  type NavSubsectionItem,
} from '../../contexts/NavSubsectionsContext';
import FloorPlanConsultPanel from './FloorPlanConsultPanel';

const LazyFloorPlansPanel = React.lazy(() => import('../Administration/FloorPlansPanel'));

type FloorSection = 'service' | 'edit';

const SECTIONS: Array<{
  key: FloorSection;
  label: string;
  icon: React.ReactElement;
  permission: typeof PERMISSIONS.manage_floor_plan | null;
}> = [
  { key: 'service', label: 'Service', icon: <ServiceIcon />, permission: null },
  {
    key: 'edit',
    label: 'Modifier le plan',
    icon: <EditIcon />,
    permission: PERMISSIONS.manage_floor_plan,
  },
];

function PanelFallback() {
  return (
    <Box display="flex" justifyContent="center" p={4}>
      <CircularProgress />
    </Box>
  );
}

interface FloorPlanTabContainerProps {
  onSwitchToPos?: () => void;
}

const FloorPlanTabContainer: React.FC<FloorPlanTabContainerProps> = ({ onSwitchToPos }) => {
  const { ensureAccess, releaseAccess } = useStepUpAuth();
  const [tab, setTab] = useState(0);
  const active = SECTIONS[Math.min(tab, SECTIONS.length - 1)]?.key ?? 'service';

  const selectSection = useCallback(
    (index: number) => {
      const next = SECTIONS[index];
      if (!next) return;
      if (!next.permission) {
        setTab(index);
        return;
      }
      void ensureAccess(next.permission, {
        title: 'Modifier le plan de salle',
        description:
          'PIN d’un profil autorisé à modifier le plan de tables (créer, déplacer, redimensionner).',
      })
        .then(() => setTab(index))
        .catch(() => undefined);
    },
    [ensureAccess]
  );

  const navItems: NavSubsectionItem[] = useMemo(
    () => SECTIONS.map((s) => ({ id: s.key, label: s.label, icon: s.icon })),
    []
  );

  const selectById = useCallback(
    (id: string) => {
      const idx = SECTIONS.findIndex((s) => s.key === id);
      if (idx >= 0) selectSection(idx);
    },
    [selectSection]
  );

  useRegisterNavSubsections('floor_plan', navItems, active, selectById);

  React.useEffect(() => {
    if (active !== 'edit') {
      releaseAccess(PERMISSIONS.manage_floor_plan);
    }
  }, [active, releaseAccess]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', minHeight: 0 }}>
      <Tabs
        value={tab}
        onChange={(_e, v: number) => selectSection(v)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
      >
        {SECTIONS.map((s) => (
          <Tab
            key={s.key}
            icon={s.icon}
            iconPosition="start"
            label={s.label}
            sx={{ textTransform: 'none' }}
          />
        ))}
      </Tabs>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {active === 'service' && <FloorPlanConsultPanel onSwitchToPos={onSwitchToPos} />}
        {active === 'edit' && (
          <Suspense fallback={<PanelFallback />}>
            <LazyFloorPlansPanel />
          </Suspense>
        )}
      </Box>
    </Box>
  );
};

export default FloorPlanTabContainer;
