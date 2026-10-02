import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Tab, Tabs, Typography, Alert, CircularProgress } from '@mui/material';
import {
  Description as DocsIcon,
  Email as InboxIcon,
  EventSeat as ResaIcon,
  CalendarMonth as PlanIcon,
  Security as AuditIcon,
  AccessTime as ClockIcon,
  Gavel as ComplianceIcon,
} from '@mui/icons-material';
import { PERMISSIONS } from '@mosehxl/types';
import type { User } from '../../types/auth';
import { useStepUpAuth } from '../../contexts/StepUpAuthContext';
import { usePinSessions } from '../../contexts/PinSessionsContext';
import {
  useRegisterNavSubsections,
  type NavSubsectionItem,
} from '../../contexts/NavSubsectionsContext';
import {
  adminSectionHeldByActor,
  firstHeldAdminSectionIndex,
} from './adminSectionAccess';
import DocumentsPanel from './DocumentsPanel';
import InboxPanel from './InboxPanel';
import ReservationsPanel from './ReservationsPanel';
import PlanningPanel from './PlanningPanel';
import TimeClockPanel from './TimeClockPanel';
import { isPlanningUiDirty, setPlanningUiDirty } from './planningDraft';

const LazyAuditTrailDashboard = React.lazy(() => import('../Admin/AuditTrailDashboard'));
const LazyLegalComplianceDashboard = React.lazy(() =>
  import('../Legal').then((mod) => ({ default: mod.LegalComplianceDashboard }))
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
  | 'inbox'
  | 'reservations'
  | 'planning'
  | 'time_clock'
  | 'documents'
  | 'compliance'
  | 'audit';

const AdministrationContainer: React.FC<AdministrationContainerProps> = ({ user, token }) => {
  const { ensureAccess, hasAccess } = useStepUpAuth();
  const { activeSession, activeSessionId } = usePinSessions();

  /**
   * Landing order: inbox + reservations first. Within the page, sections the focused
   * PIN already holds need no extra step-up; others still ask for an authorized PIN.
   */
  const sections = useMemo(
    () => [
      { key: 'inbox' as AdminSection, label: 'Boîte mail', icon: <InboxIcon />, permission: PERMISSIONS.access_inbox },
      { key: 'reservations' as AdminSection, label: 'Réservations', icon: <ResaIcon />, permission: PERMISSIONS.access_reservations },
      { key: 'planning' as AdminSection, label: 'Planning', icon: <PlanIcon />, permission: PERMISSIONS.access_planning },
      { key: 'time_clock' as AdminSection, label: 'Pointage', icon: <ClockIcon />, permission: null },
      { key: 'documents' as AdminSection, label: 'Documents', icon: <DocsIcon />, permission: PERMISSIONS.access_documents },
      { key: 'compliance' as AdminSection, label: 'Conformité Légale', icon: <ComplianceIcon />, permission: PERMISSIONS.access_compliance },
      { key: 'audit' as AdminSection, label: 'Journal de sécurité', icon: <AuditIcon />, permission: PERMISSIONS.access_compliance },
    ],
    []
  );

  const [tab, setTab] = useState(0);
  const [inboxFocusReservationId, setInboxFocusReservationId] = useState<number | null>(null);
  const active = sections[Math.min(tab, Math.max(sections.length - 1, 0))]?.key;

  // Land on the first sub-tab this PIN can open without another step-up.
  useEffect(() => {
    setTab(firstHeldAdminSectionIndex(sections, activeSession?.actor ?? null));
  }, [activeSessionId, activeSession?.actor, sections]);

  const selectAdminSection = useCallback(
    (v: number) => {
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
      // Free nav among rights this badge already holds (or a scope opened this visit).
      if (
        required == null ||
        adminSectionHeldByActor(required, activeSession?.actor ?? null) ||
        hasAccess(required)
      ) {
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
    },
    [sections, active, ensureAccess, hasAccess, activeSession?.actor]
  );

  const navItems: NavSubsectionItem[] = useMemo(
    () => sections.map((s) => ({ id: s.key, label: s.label, icon: s.icon })),
    [sections]
  );

  const selectAdminSectionById = useCallback(
    (id: string) => {
      const idx = sections.findIndex((s) => s.key === id);
      if (idx >= 0) selectAdminSection(idx);
    },
    [sections, selectAdminSection]
  );

  useRegisterNavSubsections(
    'administration',
    navItems,
    sections[Math.min(tab, Math.max(sections.length - 1, 0))]?.key ?? 'inbox',
    selectAdminSectionById
  );

  const openInboxConversation = useCallback(
    (reservationId: number) => {
      const inboxIndex = sections.findIndex((s) => s.key === 'inbox');
      if (inboxIndex < 0) return;
      const go = () => {
        setInboxFocusReservationId(reservationId);
        setTab(inboxIndex);
      };
      const required = sections[inboxIndex]?.permission;
      if (
        required == null ||
        adminSectionHeldByActor(required, activeSession?.actor ?? null) ||
        hasAccess(required)
      ) {
        go();
        return;
      }
      void ensureAccess(required, {
        title: 'Administration — Boîte mail',
        description: 'PIN d’un profil autorisé pour ouvrir « Boîte mail ».',
      })
        .then(go)
        .catch(() => undefined);
    },
    [sections, ensureAccess, hasAccess, activeSession?.actor]
  );

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
        Boîte mail, réservations, planning, pointage, documents, conformité légale et journal de
        sécurité.
      </Typography>

      <Tabs
        value={Math.min(tab, sections.length - 1)}
        onChange={(_e, v) => selectAdminSection(v)}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        {sections.map((s) => (
          <Tab
            key={s.key}
            icon={s.icon}
            iconPosition="start"
            label={s.label}
            sx={{ textTransform: 'none' }}
          />
        ))}
      </Tabs>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {active === 'inbox' && (
          <InboxPanel
            focusReservationId={inboxFocusReservationId}
            onFocusConsumed={() => setInboxFocusReservationId(null)}
          />
        )}
        {active === 'reservations' && (
          <ReservationsPanel onOpenConversation={openInboxConversation} />
        )}
        {active === 'planning' && <PlanningPanel />}
        {active === 'time_clock' && <TimeClockPanel user={user} />}
        {active === 'documents' && <DocumentsPanel />}
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
