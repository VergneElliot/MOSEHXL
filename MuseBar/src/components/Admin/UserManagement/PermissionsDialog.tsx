import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { BASIC_PERMISSION_SUMMARY, PERMISSION_GROUP_ORDER, Permission } from '../../../types/auth';

interface PermissionsDialogProps {
  open: boolean;
  userEmail: string | undefined;
  error: string | null;
  saving: boolean;
  availablePermissions: Permission[];
  enabledCount: number;
  hasPermission: (key: string) => boolean;
  onTogglePermission: (key: string, enabled: boolean) => void;
  onToggleAll: (enabled: boolean) => void;
  onClose: () => void;
  onSave: () => void;
}

/** Grants the specific-tier permissions. Basic-tier rights are implicit and not listed. */
const PermissionsDialog: React.FC<PermissionsDialogProps> = ({
  open,
  userEmail,
  error,
  saving,
  availablePermissions,
  enabledCount,
  hasPermission,
  onTogglePermission,
  onToggleAll,
  onClose,
  onSave,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Permissions pour {userEmail}</DialogTitle>
    <DialogContent>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        Permissions de base, acquises par tout le personnel : {BASIC_PERMISSION_SUMMARY.join(', ')}.
        Les cases ci-dessous sont les permissions spécifiques. Une permission spécifique impose un
        PIN de 4 à 8 chiffres : si le PIN actuel est à 2 chiffres, il est effacé et doit être
        redéfini. Les sessions PIN ouvertes de cet utilisateur sont fermées pour que le nouveau
        périmètre s’applique immédiatement.
      </Alert>

      <Box sx={{ mb: 2 }}>
        <Button onClick={() => onToggleAll(true)} size="small" sx={{ mr: 1 }}>
          Tout sélectionner
        </Button>
        <Button onClick={() => onToggleAll(false)} size="small">
          Tout désélectionner
        </Button>
      </Box>

      {PERMISSION_GROUP_ORDER.map((group) => {
        const groupPerms = availablePermissions.filter((perm) => perm.group === group);
        if (groupPerms.length === 0) return null;
        return (
          <Box key={group} sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {group}
            </Typography>
            {groupPerms.map((perm) => (
              <FormControlLabel
                key={perm.key}
                control={
                  <Checkbox
                    checked={hasPermission(perm.key)}
                    onChange={(e) => onTogglePermission(perm.key, e.target.checked)}
                  />
                }
                label={perm.label}
                sx={{ display: 'block', ml: 1 }}
              />
            ))}
          </Box>
        );
      })}

      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
        {enabledCount} permission(s) sélectionnée(s)
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Annuler</Button>
      <Button onClick={onSave} disabled={saving} variant="contained">
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default PermissionsDialog;
