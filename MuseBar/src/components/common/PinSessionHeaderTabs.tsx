import React, { Suspense, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { usePinSessions } from '../../contexts/PinSessionsContext';
import { useAuth } from '../../hooks/useAuth';
import * as floorApi from '../../services/api/floor';
import { resolvePinLengthRules } from '../../utils/pinRules';

const LazyPinPadDialog = React.lazy(() => import('../POS/PinPadDialog'));

/**
 * Header session tabs: one tab per active PIN identity.
 */
export const PinSessionHeaderTabs: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    addOrFocusSession,
    dismissSession,
  } = usePinSessions();
  const { user, permissions } = useAuth();
  const setRules = resolvePinLengthRules({
    role: user?.role ?? 'staff',
    permissions: permissions ?? user?.permissions ?? [],
  });
  const [pinOpen, setPinOpen] = useState(false);
  const [pinMode, setPinMode] = useState<'verify' | 'set'>('verify');
  const [info, setInfo] = useState<string | null>(null);

  const handleVerify = async (pin: string) => {
    const result = await floorApi.verifyPin(pin);
    addOrFocusSession({
      token: result.pin_actor_token,
      userId: result.user_id,
      displayName: result.display_name,
      email: result.email,
      role: result.role,
      permissions: result.permissions,
    });
    setPinOpen(false);
    setInfo(`Session : ${result.display_name}`);
  };

  const handleSetPin = async (pin: string) => {
    await floorApi.setPin(pin);
    setPinMode('verify');
    setInfo('PIN enregistré — vous pouvez ouvrir une session');
  };

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
          onChange={(_e, value: string) => setActiveSessionId(value)}
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
          {sessions.map((s) => (
            <Tab
              key={s.id}
              value={s.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BadgeIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                    {s.actor.displayName}
                  </Typography>
                  {s.activeTable && (
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      · {s.activeTable.label}
                    </Typography>
                  )}
                  <IconButton
                    size="small"
                    component="span"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissSession(s.id);
                    }}
                    sx={{ color: 'inherit', p: 0.25, ml: 0.25 }}
                    aria-label={`Fermer session ${s.actor.displayName}`}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              }
            />
          ))}
        </Tabs>
      ) : (
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mr: 1 }}>
          Aucune session PIN
        </Typography>
      )}
      <Tooltip title="Ouvrir une session PIN">
        <Button
          size="small"
          color="inherit"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setPinMode('verify');
            setPinOpen(true);
          }}
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
      {info && (
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.65)', display: { xs: 'none', md: 'block' } }}
        >
          {info}
        </Typography>
      )}
      <Suspense fallback={null}>
        <LazyPinPadDialog
          open={pinOpen}
          mode={pinMode}
          setRules={setRules}
          onClose={() => setPinOpen(false)}
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
