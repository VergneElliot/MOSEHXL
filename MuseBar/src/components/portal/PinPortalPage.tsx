/**
 * PIN badge portal — first screen after venue login.
 * Color = state (green clocked-in, orange badge/hours mismatch, red available).
 * Dimmed = active on server but not unlocked on this device (PIN required).
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { Wifi as WifiIcon, WifiOff as WifiOffIcon } from '@mui/icons-material';
import { usePinSessions } from '../../contexts/PinSessionsContext';
import { pinActorFromVerify } from '../../contexts/pinActorFromVerify';
import { isSessionUnlocked } from '../../contexts/pinSessionsMerge';
import { useAuth } from '../../hooks/useAuth';
import { useVisibleInterval } from '../../hooks/useVisibleInterval';
import {
  getPinPortal,
  type PinPortalCardDto,
  type PinPortalDto,
} from '../../services/api/pin';
import * as floorApi from '../../services/api/floor';
import { resolvePinLengthRules } from '../../utils/pinRules';
import { sortPortalCards } from './pinPortalCardLogic';
import { PinPortalStaffCard } from './PinPortalStaffCard';

const LazyPinPadDialog = React.lazy(() => import('../POS/PinPadDialog'));

const POLL_MS = 12_000;

type PadMode = 'open' | 'unlock' | 'close';

export type PinPortalPageProps = {
  onEnterApp: () => void;
};

export const PinPortalPage: React.FC<PinPortalPageProps> = ({ onEnterApp }) => {
  const { user, permissions } = useAuth();
  const {
    sessions,
    addOrFocusSession,
    setActiveSessionId,
    closeSessionAsPinUser,
    refreshRemoteSessions,
  } = usePinSessions();

  const [portal, setPortal] = useState<PinPortalDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'error'>('success');

  const [pinOpen, setPinOpen] = useState(false);
  const [padMode, setPadMode] = useState<PadMode>('open');
  const [pendingCard, setPendingCard] = useState<PinPortalCardDto | null>(null);
  const [pinNotice, setPinNotice] = useState<string | null>(null);

  const setRules = resolvePinLengthRules({
    role: user?.role ?? 'staff',
    permissions: permissions ?? user?.permissions ?? [],
  });

  const unlockedUserIds = useMemo(() => {
    const ids = new Set<number>();
    for (const s of sessions) {
      if (isSessionUnlocked(s)) ids.add(s.actor.userId);
    }
    return ids;
  }, [sessions]);

  const sortedCards = useMemo(
    () => sortPortalCards(portal?.cards ?? [], unlockedUserIds),
    [portal?.cards, unlockedUserIds]
  );

  const refresh = useCallback(async () => {
    try {
      const data = await getPinPortal();
      setPortal(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur portail');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useVisibleInterval(() => {
    void refresh();
  }, POLL_MS, true);

  const openPad = (card: PinPortalCardDto, mode: PadMode, notice: string) => {
    setPendingCard(card);
    setPadMode(mode);
    setPinNotice(notice);
    setPinOpen(true);
  };

  const handleCardClick = (card: PinPortalCardDto) => {
    const unlockedHere = unlockedUserIds.has(card.user_id);
    if (card.badge === 'open' && unlockedHere) {
      const local = sessions.find((s) => s.actor.userId === card.user_id && isSessionUnlocked(s));
      if (local) setActiveSessionId(local.id);
      onEnterApp();
      return;
    }
    if (card.badge === 'open') {
      openPad(
        card,
        'unlock',
        `Saisissez le PIN de ${card.display_name} pour activer ce badge sur cet appareil.`
      );
      return;
    }
    openPad(card, 'open', `Saisissez le PIN de ${card.display_name} pour ouvrir une session.`);
  };

  const handleLogoutClick = (e: React.MouseEvent, card: PinPortalCardDto) => {
    e.stopPropagation();
    if (card.badge !== 'open') return;
    if (card.owned_table_count > 0) {
      const labels = card.owned_tables.map((t) => t.label).join(', ');
      setToastSeverity('error');
      setToast(
        `Impossible de fermer : ${card.owned_table_count} table(s) encore assignée(s) (${labels}).`
      );
      return;
    }
    openPad(
      card,
      'close',
      `Saisissez le PIN de ${card.display_name} pour fermer le badge et pointer la sortie.`
    );
  };

  const handleVerify = async (pin: string) => {
    if (!pendingCard) throw new Error('Profil introuvable');
    const result = await floorApi.verifyPin(pin);
    if (result.user_id !== pendingCard.user_id) {
      throw new Error(`Ce PIN ne correspond pas à ${pendingCard.display_name}.`);
    }

    if (padMode === 'close') {
      const sessionId =
        result.pin_session_id ??
        pendingCard.session_id ??
        sessions.find((s) => s.actor.userId === pendingCard.user_id)?.actor.sessionId;
      if (!sessionId) {
        throw new Error('Session introuvable — actualisez puis réessayez.');
      }
      const closeResult = await closeSessionAsPinUser(sessionId, result.pin_actor_token);
      setPinOpen(false);
      setPendingCard(null);
      await refresh();
      await refreshRemoteSessions();
      const pointage = closeResult.pointage;
      if (pointage?.recorded) {
        setToastSeverity('success');
        setToast(`Session fermée et sortie pointée : ${result.display_name}`);
      } else if (pointage?.reason === 'off_network') {
        setToastSeverity('info');
        setToast(
          `Badge fermé : ${result.display_name} — sortie NON pointée (réseau non autorisé).`
        );
      } else {
        setToastSeverity('info');
        setToast(
          `Badge fermé : ${result.display_name} — ${pointage?.reason ?? 'sortie non enregistrée'}.`
        );
      }
      return;
    }

    addOrFocusSession(pinActorFromVerify(result));
    setPinOpen(false);
    setPendingCard(null);
    await refresh();
    setToastSeverity('success');
    setToast(
      padMode === 'unlock'
        ? `Badge activé : ${result.display_name}`
        : `Session ouverte : ${result.display_name}`
    );
    onEnterApp();
  };

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        p: { xs: 2, md: 3 },
        bgcolor: 'background.default',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1}
        sx={{ mb: 2.5 }}
      >
        <Typography variant="h4" fontWeight={700} color="text.primary">
          Équipe
        </Typography>
        <Chip
          icon={portal?.on_venue_network ? <WifiIcon /> : <WifiOffIcon />}
          color={portal?.on_venue_network ? 'success' : 'warning'}
          label={
            portal?.on_venue_network
              ? 'Réseau de pointage OK'
              : 'Hors réseau de pointage'
          }
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && !portal ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2,
          }}
        >
          {sortedCards.map((card) => (
            <PinPortalStaffCard
              key={card.user_id}
              card={card}
              unlockedHere={unlockedUserIds.has(card.user_id)}
              onOpen={handleCardClick}
              onCloseBadge={handleLogoutClick}
            />
          ))}
        </Box>
      )}

      <Suspense fallback={null}>
        <LazyPinPadDialog
          open={pinOpen}
          mode="verify"
          setRules={setRules}
          hideSetPin
          stepUp={
            pinNotice
              ? {
                  title:
                    padMode === 'close'
                      ? 'Fermer le badge'
                      : padMode === 'unlock'
                        ? 'Activer le badge'
                        : 'Ouvrir une session',
                  description: pinNotice,
                }
              : undefined
          }
          onVerify={handleVerify}
          onSetPin={async () => undefined}
          onSwitchToSet={() => undefined}
          onSwitchToVerify={() => undefined}
          onClose={() => {
            setPinOpen(false);
            setPendingCard(null);
          }}
        />
      </Suspense>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4500}
        onClose={() => setToast(null)}
        message={toast}
        ContentProps={{
          sx: {
            bgcolor:
              toastSeverity === 'error'
                ? 'error.main'
                : toastSeverity === 'info'
                  ? 'warning.dark'
                  : 'success.main',
          },
        }}
      />
    </Box>
  );
};

export default PinPortalPage;
