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
import {
  PIN_ELEVATED_MAX_LENGTH,
  PIN_VERIFY_MAX_LENGTH,
  PIN_VERIFY_MIN_LENGTH,
  type PinLengthRules,
} from '../../utils/pinRules';

interface PinPadDialogProps {
  open: boolean;
  mode: 'verify' | 'set';
  onClose: () => void;
  onVerify: (pin: string) => Promise<void>;
  onSetPin: (pin: string) => Promise<void>;
  onSwitchToSet: () => void;
  onSwitchToVerify: () => void;
  /** Required length rules when mode === 'set' (defaults to elevated 4–8). */
  setRules?: PinLengthRules;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ok', '0', 'back'] as const;

export const PinPadDialog: React.FC<PinPadDialogProps> = ({
  open,
  mode,
  onClose,
  onVerify,
  onSetPin,
  onSwitchToSet,
  onSwitchToVerify,
  setRules,
}) => {
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules: PinLengthRules =
    setRules ??
    ({
      kind: 'elevated',
      min_length: 4,
      max_length: PIN_ELEVATED_MAX_LENGTH,
    } as PinLengthRules);

  const maxLen = mode === 'verify' ? PIN_VERIFY_MAX_LENGTH : rules.max_length;
  const minLen = mode === 'verify' ? PIN_VERIFY_MIN_LENGTH : rules.min_length;
  const canSubmit =
    digits.length >= minLen &&
    digits.length <= maxLen &&
    (mode === 'verify' || (digits.length >= rules.min_length && digits.length <= rules.max_length));

  useEffect(() => {
    if (open) {
      setDigits('');
      setError(null);
      setBusy(false);
    }
  }, [open, mode]);

  const submit = useCallback(
    async (pin: string) => {
      if (busy) return;
      if (mode === 'verify') {
        if (pin.length < PIN_VERIFY_MIN_LENGTH || pin.length > PIN_VERIFY_MAX_LENGTH) return;
      } else if (pin.length < rules.min_length || pin.length > rules.max_length) {
        return;
      }
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
    [busy, mode, onVerify, onSetPin, rules.min_length, rules.max_length]
  );

  const pushDigit = useCallback(
    (d: string) => {
      if (busy) return;
      setDigits((prev) => {
        if (prev.length >= maxLen) return prev;
        return prev + d;
      });
    },
    [busy, maxLen]
  );

  const handleKey = useCallback(
    (key: (typeof KEYS)[number]) => {
      if (key === 'ok') {
        if (canSubmit) void submit(digits);
        return;
      }
      if (key === 'back') {
        setDigits((prev) => prev.slice(0, -1));
        return;
      }
      pushDigit(key);
    },
    [pushDigit, canSubmit, submit, digits]
  );

  const slotCount = mode === 'verify' ? Math.max(digits.length, 2) : rules.max_length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BadgeIcon />
        {mode === 'verify'
          ? 'Session PIN'
          : rules.kind === 'basic'
            ? 'Définir un PIN (2 chiffres)'
            : `Définir un PIN (${rules.min_length}–${rules.max_length} chiffres)`}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {mode === 'verify'
            ? 'Entrez votre code PIN (2 chiffres pour le personnel de base, 4 à 8 pour les profils élevés), puis Valider.'
            : rules.kind === 'basic'
              ? 'PIN d’identification à 2 chiffres, unique dans l’établissement.'
              : 'PIN renforcé (4 à 8 chiffres) — ce compte a des permissions élevées.'}
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
            flexWrap: 'wrap',
          }}
          aria-label="PIN saisi"
        >
          {Array.from({ length: Math.min(slotCount, 8) }).map((_, i) => (
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
          {KEYS.map((key) =>
            key === 'ok' ? (
              <Button
                key="ok"
                variant="contained"
                onClick={() => handleKey('ok')}
                disabled={busy || !canSubmit}
                sx={{ height: 56, fontSize: '0.95rem' }}
              >
                OK
              </Button>
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
            Retour session
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
