import React, { Suspense, useMemo, useState } from 'react';
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
import { PERMISSIONS } from '@mosehxl/types';
import type { User } from '../../types/auth';
import DocumentsPanel from './DocumentsPanel';
import InboxPanel from './InboxPanel';
import ReservationsPanel from './ReservationsPanel';
import PlanningPanel from './PlanningPanel';
import TimeClockPanel from './TimeClockPanel';
import FloorPlansPanel from './FloorPlansPanel';

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
  const sections = useMemo(() => {
    const perms = user.permissions ?? [];
    const isEstAdmin = user.role === 'establishment_admin';
    const items: Array<{ key: AdminSection; label: string; icon: React.ReactElement }> = [];
    if (isEstAdmin || perms.includes(PERMISSIONS.access_documents)) {
      items.push({ key: 'documents', label: 'Documents', icon: <DocsIcon /> });
    }
    if (isEstAdmin || perms.includes(PERMISSIONS.access_inbox)) {
      items.push({ key: 'inbox', label: 'Boîte mail', icon: <InboxIcon /> });
    }
    if (isEstAdmin || perms.includes(PERMISSIONS.access_reservations)) {
      items.push({ key: 'reservations', label: 'Réservations', icon: <ResaIcon /> });
    }
    if (isEstAdmin || perms.includes(PERMISSIONS.access_planning)) {
      items.push({ key: 'planning', label: 'Planning', icon: <PlanIcon /> });
    }
    // Shared terminal + hours report: any establishment member can open Pointage;
    // report edit requires planning/admin (enforced in the panel / API).
    if (user.role !== 'system_admin' && user.establishment_id) {
      items.push({ key: 'time_clock', label: 'Pointage', icon: <ClockIcon /> });
    }
    if (isEstAdmin || perms.includes(PERMISSIONS.manage_floor_plan)) {
      items.push({ key: 'floor', label: 'Plans de tables', icon: <FloorIcon /> });
    }
    if (isEstAdmin || perms.includes(PERMISSIONS.access_user_management)) {
      items.push({ key: 'users', label: 'Utilisateurs', icon: <UsersIcon /> });
    }
    // Legal compliance dashboard: establishment admin only (moved from its own top-level tab).
    if (isEstAdmin) {
      items.push({ key: 'compliance', label: 'Conformité Légale', icon: <ComplianceIcon /> });
    }
    if (isEstAdmin) {
      items.push({ key: 'audit', label: 'Journal de sécurité', icon: <AuditIcon /> });
    }
    return items;
  }, [user]);

  const [tab, setTab] = useState(0);
  const active = sections[Math.min(tab, Math.max(sections.length - 1, 0))]?.key;

  if (sections.length === 0) {
    return (
      <Alert severity="info">
        Vous n&apos;avez pas accès à l&apos;espace Administration. Demandez les permissions
        nécessaires à un administrateur.
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
        onChange={(_e, v) => setTab(v)}
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
