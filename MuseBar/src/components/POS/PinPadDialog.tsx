import React, { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Backspace as BackspaceIcon, Badge as BadgeIcon } from '@mui/icons-material';

interface PinPadDialogProps {
  open: boolean;
  mode: 'verify' | 'set';
  onClose: () => void;
  onVerify: (pin: string) => Promise<void>;
  onSetPin: (pin: string) => Promise<void>;
  onSwitchToSet: () => void;
  onSwitchToVerify: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const;

export const PinPadDialog: React.FC<PinPadDialogProps> = ({
  open,
  mode,
  onClose,
  onVerify,
  onSetPin,
  onSwitchToSet,
  onSwitchToVerify,
}) => {
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDigits('');
      setError(null);
      setBusy(false);
    }
  }, [open, mode]);

  const submit = useCallback(
    async (pin: string) => {
      if (pin.length !== 6 || busy) return;
      setBusy(true);
      setError(null);
      try {
        if (mode === 'verify') await onVerify(pin);
        else await onSetPin(pin);
        setDigits('');
      } catch (err: unknown) {
        const e = err as { message?: string };
        setError(e.message || (mode === 'verify' ? 'PIN invalide' : 'Impossible d’enregistrer le PIN'));
        setDigits('');
      } finally {
        setBusy(false);
      }
    },
    [busy, mode, onVerify, onSetPin]
  );

  const pushDigit = useCallback(
    (d: string) => {
      if (busy) return;
      setDigits((prev) => {
        if (prev.length >= 6) return prev;
        const next = prev + d;
        if (next.length === 6) {
          void submit(next);
        }
        return next;
      });
    },
    [busy, submit]
  );

  const handleKey = useCallback(
    (key: (typeof KEYS)[number]) => {
      if (key === '') return;
      if (key === 'back') {
        setDigits((prev) => prev.slice(0, -1));
        return;
      }
      pushDigit(key);
    },
    [pushDigit]
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BadgeIcon />
        {mode === 'verify' ? 'Badge serveur' : 'Définir un PIN (6 chiffres)'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {mode === 'verify'
            ? 'Entrez votre code PIN pour vous identifier sur cette caisse.'
            : 'Réservé aux comptes avec gestion des utilisateurs. Le PIN est lié à votre profil.'}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 1,
            mb: 2,
            letterSpacing: 4,
            fontSize: '1.75rem',
            fontFamily: 'monospace',
            minHeight: 40,
          }}
          aria-label="PIN saisi"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                bgcolor: i < digits.length ? 'primary.main' : 'action.disabledBackground',
              }}
            />
          ))}
        </Box>
        {error && (
          <Typography color="error" variant="body2" align="center" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            maxWidth: 280,
            mx: 'auto',
          }}
        >
          {KEYS.map((key, idx) =>
            key === '' ? (
              <Box key={`empty-${idx}`} />
            ) : key === 'back' ? (
              <IconButton
                key="back"
                onClick={() => handleKey('back')}
                disabled={busy}
                sx={{ height: 56 }}
                aria-label="Effacer"
              >
                <BackspaceIcon />
              </IconButton>
            ) : (
              <Button
                key={key}
                variant="outlined"
                onClick={() => handleKey(key)}
                disabled={busy}
                sx={{ height: 56, fontSize: '1.25rem' }}
              >
                {key}
              </Button>
            )
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        {mode === 'verify' ? (
          <Button size="small" onClick={onSwitchToSet} disabled={busy}>
            Définir mon PIN
          </Button>
        ) : (
          <Button size="small" onClick={onSwitchToVerify} disabled={busy}>
            Retour badge
          </Button>
        )}
        <Button onClick={onClose} disabled={busy}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PinPadDialog;
