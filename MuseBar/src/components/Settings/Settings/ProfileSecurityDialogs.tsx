/**
 * Profile security: change password / PIN buttons and dialogs.
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { Lock as LockIcon, Pin as PinIcon } from '@mui/icons-material';
import { ApiService } from '../../../services/apiService';
import { setPin as apiSetPin } from '../../../services/api/floor';
import PinPadDialog from '../../POS/PinPadDialog';
import { useAuth } from '../../../hooks/useAuth';
import { resolvePinLengthRules } from '../../../utils/pinRules';
import { logger } from '../../../utils/logger';

const api = ApiService.getInstance();

export interface ProfileSecurityDialogsProps {
  onMessage: (message: string) => void;
}

export const ProfileSecurityDialogs: React.FC<ProfileSecurityDialogsProps> = ({
  onMessage,
}) => {
  const { user, permissions, logout } = useAuth();

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [pinOpen, setPinOpen] = useState(false);

  const pinRules = useMemo(
    () =>
      resolvePinLengthRules({
        role: user?.role || 'staff',
        permissions: permissions || [],
      }),
    [user?.role, permissions]
  );

  const submitPassword = async () => {
    setPasswordError(null);
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('Mot de passe actuel et nouveau mot de passe requis');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('La confirmation ne correspond pas');
      return;
    }
    setPasswordBusy(true);
    try {
      await api.post('/auth/password/change', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onMessage('Mot de passe modifié — reconnexion requise');
      logout();
    } catch (err) {
      logger.error('Failed to change password', err);
      setPasswordError(
        err instanceof Error ? err.message : 'Impossible de changer le mot de passe'
      );
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleSetPin = async (pin: string) => {
    await apiSetPin(pin);
    setPinOpen(false);
    onMessage('PIN enregistré');
  };

  return (
    <>
      <Typography variant="subtitle1" gutterBottom>
        Sécurité du compte
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Changer le mot de passe de connexion ou le PIN d’identification en salle.
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <Button
          variant="outlined"
          startIcon={<LockIcon />}
          onClick={() => {
            setPasswordError(null);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordOpen(true);
          }}
        >
          Changer le mot de passe
        </Button>
        <Button variant="outlined" startIcon={<PinIcon />} onClick={() => setPinOpen(true)}>
          Changer mon PIN
        </Button>
      </Box>

      <Dialog
        open={passwordOpen}
        onClose={() => !passwordBusy && setPasswordOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Changer le mot de passe</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Après modification, vous serez déconnecté et devrez vous reconnecter.
          </Typography>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPasswordError(null)}>
              {passwordError}
            </Alert>
          )}
          <TextField
            label="Mot de passe actuel"
            type="password"
            fullWidth
            autoComplete="current-password"
            value={passwordForm.currentPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
            }
            disabled={passwordBusy}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Nouveau mot de passe"
            type="password"
            fullWidth
            autoComplete="new-password"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, newPassword: e.target.value })
            }
            disabled={passwordBusy}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Confirmer le nouveau mot de passe"
            type="password"
            fullWidth
            autoComplete="new-password"
            value={passwordForm.confirmPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
            }
            disabled={passwordBusy}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordOpen(false)} disabled={passwordBusy}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={() => void submitPassword()}
            disabled={passwordBusy}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <PinPadDialog
        open={pinOpen}
        mode="set"
        onClose={() => setPinOpen(false)}
        onVerify={async () => undefined}
        onSetPin={handleSetPin}
        onSwitchToSet={() => undefined}
        onSwitchToVerify={() => undefined}
        setRules={pinRules}
        hideSetPin
        stepUp={{
          title:
            pinRules.kind === 'basic'
              ? 'Changer mon PIN (2 chiffres)'
              : `Changer mon PIN (${pinRules.min_length}–${pinRules.max_length} chiffres)`,
          description:
            pinRules.kind === 'basic'
              ? 'Choisissez un PIN à 2 chiffres, unique dans l’établissement.'
              : 'Choisissez un PIN renforcé, unique dans l’établissement.',
        }}
      />
    </>
  );
};

export default ProfileSecurityDialogs;
