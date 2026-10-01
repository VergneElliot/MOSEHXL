import React, { Suspense } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Snackbar,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { isSessionUnlocked } from '../../contexts/pinSessionsMerge';
import { resolvePinLengthRules } from '../../utils/pinRules';
import { PinSessionHeaderTabLabel } from './PinSessionHeaderTabLabel';
import { usePinSessionHeaderActions } from './usePinSessionHeaderActions';

const LazyPinPadDialog = React.lazy(() => import('../POS/PinPadDialog'));

const TOAST_MS = 3000;

/**
 * Header session tabs: establishment-wide open badges; focus needs PIN when locked here.
 */
export const PinSessionHeaderTabs: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    pinOpen,
    pinMode,
    setPinMode,
    toast,
    setToast,
    toastSeverity,
    renewNotice,
    unlockUserId,
    padPurpose,
    isExpired,
    isSyncingRemoteSessions,
    requestActivateSession,
    requestDismissSession,
    openNewSessionPad,
    handleVerify,
    handleSetPin,
    closePad,
    handleManualRefresh,
  } = usePinSessionHeaderActions();
  const { user, permissions } = useAuth();
  const setRules = resolvePinLengthRules({
    role: user?.role ?? 'staff',
    permissions: permissions ?? user?.permissions ?? [],
  });

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
        flex: 1,
        px: 0.5,
        py: 0.25,
        borderRadius: 1,
        border: '1px solid rgba(255,255,255,0.18)',
        bgcolor: 'rgba(0,0,0,0.22)',
      }}
    >
      {sessions.length > 0 ? (
        <Tabs
          value={activeSessionId ?? false}
          onChange={(_e, value: string) => requestActivateSession(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 40,
            maxWidth: { xs: 180, sm: 320, md: 480 },
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0.25,
              px: 0.75,
              mx: 0.25,
              textTransform: 'none',
              color: 'rgba(255,255,255,0.75)',
              borderRadius: 1,
              border: '1px solid transparent',
              minWidth: 'auto',
            },
            '& .Mui-selected': {
              color: '#fff !important',
              bgcolor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.35)',
            },
            '& .MuiTabs-indicator': { display: 'none' },
          }}
        >
          {sessions.map((s) => {
            const expired = isExpired(s.id);
            const unlocked = isSessionUnlocked(s);
            return (
              <Tab
                key={s.id}
                value={s.id}
                sx={!unlocked || expired ? { opacity: 0.65 } : undefined}
                label={
                  <PinSessionHeaderTabLabel
                    session={s}
                    expired={expired}
                    unlocked={unlocked}
                    onDismiss={() => requestDismissSession(s.id)}
                  />
                }
              />
            );
          })}
        </Tabs>
      ) : (
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mr: 0.5 }}>
          Aucune session — appuyez sur Session
        </Typography>
      )}
      <Tooltip title="Actualiser la liste des badges">
        <span>
          <IconButton
            size="small"
            color="inherit"
            onClick={() => void handleManualRefresh()}
            disabled={isSyncingRemoteSessions}
            aria-label="Actualiser les sessions PIN"
            sx={{ p: 0.5 }}
          >
            {isSyncingRemoteSessions ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <RefreshIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Ouvrir une session PIN">
        <Button
          size="small"
          color="inherit"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={openNewSessionPad}
          sx={{
            textTransform: 'none',
            borderColor: 'rgba(255,255,255,0.4)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Session
        </Button>
      </Tooltip>
      <Snackbar
        open={toast != null}
        autoHideDuration={TOAST_MS}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toastSeverity} variant="filled" onClose={() => setToast(null)}>
          {toast}
        </Alert>
      </Snackbar>
      <Suspense fallback={null}>
        <LazyPinPadDialog
          open={pinOpen}
          mode={pinMode}
          setRules={setRules}
          stepUp={
            renewNotice
              ? {
                  title:
                    padPurpose === 'close'
                      ? 'Fermer ce badge'
                      : unlockUserId != null
                        ? 'Activer ce badge'
                        : 'Session expirée',
                  description: renewNotice,
                }
              : undefined
          }
          onClose={closePad}
          onVerify={handleVerify}
          onSetPin={handleSetPin}
          onSwitchToSet={() => setPinMode('set')}
          onSwitchToVerify={() => setPinMode('verify')}
        />
      </Suspense>
    </Box>
  );
};

export default PinSessionHeaderTabs;
