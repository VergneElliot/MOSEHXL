import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Tab, Tabs, Typography, Alert, CircularProgress } from '@mui/material';
import {
  Description as DocsIcon,
  Email as InboxIcon,
  EventSeat as ResaIcon,
  CalendarMonth as PlanIcon,
  People as UsersIcon,
  Security as AuditIcon,
  AccessTime as ClockIcon,
  Gavel as ComplianceIcon,
  TableRestaurant as FloorIcon,
} from '@mui/icons-material';
import { PERMISSIONS, type PermissionName } from '@mosehxl/types';
import type { User } from '../../types/auth';
import { useStepUpAuth } from '../../contexts/StepUpAuthContext';
import { usePinSessions } from '../../contexts/PinSessionsContext';
import DocumentsPanel from './DocumentsPanel';
import InboxPanel from './InboxPanel';
import ReservationsPanel from './ReservationsPanel';
import PlanningPanel from './PlanningPanel';
import TimeClockPanel from './TimeClockPanel';
import FloorPlansPanel from './FloorPlansPanel';
import { isPlanningUiDirty, setPlanningUiDirty } from './planningDraft';

const LazyUserManagement = React.lazy(() => import('../Admin/UserManagement'));
const LazyAuditTrailDashboard = React.lazy(() => import('../Admin/AuditTrailDashboard'));
const LazyLegalComplianceDashboard = React.lazy(() =>
  import('../Legal').then(mod => ({ default: mod.LegalComplianceDashboard }))
);

function PanelFallback() {
  return (
    <Box display="flex" justifyContent="center" p={3}>
      <CircularProgress />
    </Box>
  );
}

interface AdministrationContainerProps {
  user: User;
  token: string;
}

type AdminSection =
  | 'documents'
  | 'inbox'
  | 'reservations'
  | 'planning'
  | 'time_clock'
  | 'floor'
  | 'users'
  | 'compliance'
  | 'audit';

const AdministrationContainer: React.FC<AdministrationContainerProps> = ({ user, token }) => {
  const { ensureAccess, hasAccess, releaseAccess } = useStepUpAuth();
  const { activeSession } = usePinSessions();

  /**
   * Every section stays visible; opening one asks for a PIN when the acting identity lacks
   * its permission. Pointage is basic — any member of the establishment may clock in.
   */
  const sections = useMemo(
    () => [
      { key: 'documents' as AdminSection, label: 'Documents', icon: <DocsIcon />, permission: PERMISSIONS.access_documents },
      { key: 'inbox' as AdminSection, label: 'Boîte mail', icon: <InboxIcon />, permission: PERMISSIONS.access_inbox },
      { key: 'reservations' as AdminSection, label: 'Réservations', icon: <ResaIcon />, permission: PERMISSIONS.access_reservations },
      { key: 'planning' as AdminSection, label: 'Planning', icon: <PlanIcon />, permission: PERMISSIONS.access_planning },
      { key: 'time_clock' as AdminSection, label: 'Pointage', icon: <ClockIcon />, permission: null },
      { key: 'floor' as AdminSection, label: 'Plans de tables', icon: <FloorIcon />, permission: PERMISSIONS.manage_floor_plan },
      { key: 'users' as AdminSection, label: 'Utilisateurs', icon: <UsersIcon />, permission: PERMISSIONS.access_user_management },
      { key: 'compliance' as AdminSection, label: 'Conformité Légale', icon: <ComplianceIcon />, permission: PERMISSIONS.access_compliance },
      { key: 'audit' as AdminSection, label: 'Journal de sécurité', icon: <AuditIcon />, permission: PERMISSIONS.access_compliance },
    ],
    []
  );

  const [tab, setTab] = useState(0);
  const active = sections[Math.min(tab, Math.max(sections.length - 1, 0))]?.key;

  const canOpen = useCallback(
    (permission: PermissionName | null): boolean => {
      if (!permission) return true;
      if (activeSession) return hasAccess(permission);
      return user.permissions?.includes(permission) ?? false;
    },
    [activeSession, hasAccess, user.permissions]
  );

  // Leaving a section ends the authorization its PIN granted.
  useEffect(() => {
    const keep = sections.find((s) => s.key === active)?.permission;
    for (const section of sections) {
      if (section.permission && section.permission !== keep) {
        releaseAccess(section.permission);
      }
    }
  }, [active, sections, releaseAccess]);

  if (!user.establishment_id) {
    return (
      <Alert severity="info">
        Vous n&apos;avez pas accès à l&apos;espace Administration : aucun établissement
        n&apos;est associé à ce compte.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', minHeight: 0 }}>
      <Typography variant="h4">Administration</Typography>
      <Typography variant="body2" color="text.secondary">
        Documents, boîte mail, réservations, planning, pointage, plans de tables, utilisateurs,
        conformité légale et journal de sécurité.
      </Typography>

      <Tabs
        value={Math.min(tab, sections.length - 1)}
        onChange={(_e, v) => {
          const next = sections[v];
          if (!next) return;
          if (active === 'planning' && next.key !== 'planning' && isPlanningUiDirty()) {
            const ok = window.confirm(
              'Des modifications du planning ne sont pas enregistrées. Quitter sans enregistrer ?'
            );
            if (!ok) return;
            setPlanningUiDirty(false);
          }
          const required = next.permission;
          if (!required || canOpen(required)) {
            setTab(v);
            return;
          }
          void ensureAccess(required, {
            title: `Administration — ${next.label}`,
            description: `PIN d’un profil autorisé pour ouvrir « ${next.label} ».`,
          })
            .then(() => setTab(v))
            .catch(() => {
              /* stay on current section */
            });
        }}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        {sections.map((s) => (
          <Tab key={s.key} icon={s.icon} iconPosition="start" label={s.label} sx={{ textTransform: 'none' }} />
        ))}
      </Tabs>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {active === 'documents' && <DocumentsPanel />}
        {active === 'inbox' && <InboxPanel />}
        {active === 'reservations' && <ReservationsPanel />}
        {active === 'planning' && <PlanningPanel />}
        {active === 'time_clock' && <TimeClockPanel user={user} />}
        {active === 'floor' && <FloorPlansPanel />}
        {active === 'users' && (
          <Suspense fallback={<PanelFallback />}>
            <LazyUserManagement token={token} />
          </Suspense>
        )}
        {active === 'compliance' && (
          <Suspense fallback={<PanelFallback />}>
            <LazyLegalComplianceDashboard />
          </Suspense>
        )}
        {active === 'audit' && (
          <Suspense fallback={<PanelFallback />}>
            <LazyAuditTrailDashboard token={token} />
          </Suspense>
        )}
      </Box>
    </Box>
  );
};

export default AdministrationContainer;
