/**
 * Header bar with venue switcher (owner PIN challenge), clock, and happy hour.
 * PIN session tabs live in AppMainNav so top-bar zoom does not hide them.
 */

import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { User } from '../../types/auth';
import { useTranslation } from 'react-i18next';
import { TimeClockHeaderControl } from './TimeClockHeaderControl';
import { DisplayScaleControl } from './DisplayScaleControl';
import { HappyHourHeaderChip } from './HappyHourHeaderChip';
import { PwaInstallControl } from './PwaInstallControl';

interface AppHeaderProps {
  isHappyHourActive: boolean;
  timeUntilHappyHour: string;
  onLogout: () => void;
  user: User | null;
  onSwitchEstablishment?: (establishmentId: string, ownerPin: string) => Promise<void> | void;
  showPinSessions?: boolean;
  onHappyHourStatusUpdate?: () => void;
  establishmentBrandName?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isHappyHourActive,
  timeUntilHappyHour,
  onLogout,
  user,
  onSwitchEstablishment,
  showPinSessions = false,
  onHappyHourStatusUpdate = () => {},
  establishmentBrandName = '',
}) => {
  const { t } = useTranslation('common');
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [switching, setSwitching] = React.useState(false);
  const [pendingEstablishmentId, setPendingEstablishmentId] = React.useState<string | null>(null);
  const [ownerPin, setOwnerPin] = React.useState('');
  const [pinError, setPinError] = React.useState<string | null>(null);

  const membershipName =
    user?.memberships?.find((m) => m.establishment_id === user?.establishment_id)?.name?.trim() ??
    '';
  const venueName = establishmentBrandName.trim() || membershipName;
  const posTitle = venueName ? `${venueName} POS` : t('appTitleFallback');

  const memberships = user?.memberships ?? [];
  const showSwitcher =
    Boolean(onSwitchEstablishment) &&
    user?.role !== 'system_admin' &&
    memberships.length > 1;

  const pendingName =
    memberships.find((m) => m.establishment_id === pendingEstablishmentId)?.name ||
    pendingEstablishmentId ||
    '';

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (!showSwitcher) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleSelect = (establishmentId: string) => {
    if (!onSwitchEstablishment || establishmentId === user?.establishment_id) {
      handleClose();
      return;
    }
    handleClose();
    setPendingEstablishmentId(establishmentId);
    setOwnerPin('');
    setPinError(null);
  };

  const handleConfirmSwitch = async () => {
    if (!onSwitchEstablishment || !pendingEstablishmentId) return;
    if (!/^\d{2,8}$/.test(ownerPin.trim())) {
      setPinError('Saisissez le PIN propriétaire de ce compte sur l’établissement cible');
      return;
    }
    setSwitching(true);
    setPinError(null);
    try {
      await onSwitchEstablishment(pendingEstablishmentId, ownerPin.trim());
      setPendingEstablishmentId(null);
      setOwnerPin('');
    } catch (err: unknown) {
      const e = err as { message?: string; response?: { data?: { error?: string } } };
      setPinError(
        e.response?.data?.error || e.message || 'Basculement impossible — vérifiez le PIN'
      );
    } finally {
      setSwitching(false);
    }
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1a1a1a' }}>
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
        <RestaurantIcon sx={{ mr: 1, flexShrink: 0 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, mr: 1 }} noWrap>
          {posTitle}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <PwaInstallControl />
          {showPinSessions && <DisplayScaleControl />}
          {user && user.role !== 'system_admin' && user.establishment_id && (
            <TimeClockHeaderControl />
          )}
          <HappyHourHeaderChip
            isHappyHourActive={isHappyHourActive}
            timeUntilHappyHour={timeUntilHappyHour}
            onStatusUpdate={onHappyHourStatusUpdate}
          />

          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                color="inherit"
                onClick={handleOpen}
                disabled={switching}
                endIcon={showSwitcher ? <ExpandMoreIcon /> : undefined}
                sx={{
                  textTransform: 'none',
                  cursor: showSwitcher ? 'pointer' : 'default',
                  minWidth: 0,
                  px: showSwitcher ? 1 : 0,
                }}
              >
                <Typography variant="body2" sx={{ color: 'white' }}>
                  {user.first_name} {user.last_name}
                </Typography>
              </Button>
              {showSwitcher && (
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  {memberships.map((m) => {
                    const selected = m.establishment_id === user.establishment_id;
                    return (
                      <MenuItem
                        key={m.establishment_id}
                        selected={selected}
                        disabled={switching}
                        onClick={() => handleSelect(m.establishment_id)}
                      >
                        {selected && (
                          <ListItemIcon>
                            <CheckIcon fontSize="small" />
                          </ListItemIcon>
                        )}
                        <ListItemText
                          inset={!selected}
                          primary={m.name || m.establishment_id}
                          secondary={m.role}
                        />
                      </MenuItem>
                    );
                  })}
                </Menu>
              )}
              <Button color="inherit" onClick={onLogout} sx={{ textTransform: 'none' }}>
                {t('auth.logout')}
              </Button>
            </Box>
          )}
        </Box>
      </Toolbar>

      <Dialog
        open={pendingEstablishmentId != null}
        onClose={() => !switching && setPendingEstablishmentId(null)}
      >
        <DialogTitle>Basculer vers {pendingName}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Saisissez le PIN propriétaire de votre compte sur cet établissement.
          </Typography>
          {pinError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {pinError}
            </Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            label="PIN propriétaire"
            type="password"
            value={ownerPin}
            onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleConfirmSwitch();
            }}
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingEstablishmentId(null)} disabled={switching}>
            Annuler
          </Button>
          <Button variant="contained" onClick={() => void handleConfirmSwitch()} disabled={switching}>
            Basculer
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};
