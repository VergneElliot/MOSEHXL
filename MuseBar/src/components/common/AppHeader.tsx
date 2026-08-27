import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { User } from '../../types/auth';
import { useTranslation } from 'react-i18next';
import { TimeClockHeaderControl } from './TimeClockHeaderControl';
import { PinSessionHeaderTabs } from './PinSessionHeaderTabs';

interface AppHeaderProps {
  isHappyHourActive: boolean;
  timeUntilHappyHour: string;
  onLogout: () => void;
  user: User | null;
  onSwitchEstablishment?: (establishmentId: string) => Promise<void> | void;
  /** Show PIN session tabs (establishment POS shell). */
  showPinSessions?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isHappyHourActive,
  timeUntilHappyHour,
  onLogout,
  user,
  onSwitchEstablishment,
  showPinSessions = false,
}) => {
  const { t } = useTranslation('common');
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [switching, setSwitching] = React.useState(false);

  const memberships = user?.memberships ?? [];
  const showSwitcher =
    Boolean(onSwitchEstablishment) &&
    user?.role !== 'system_admin' &&
    memberships.length > 1;

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (!showSwitcher) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleSelect = async (establishmentId: string) => {
    if (!onSwitchEstablishment || establishmentId === user?.establishment_id) {
      handleClose();
      return;
    }
    setSwitching(true);
    try {
      await onSwitchEstablishment(establishmentId);
    } finally {
      setSwitching(false);
      handleClose();
    }
  };

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1a1a1a' }}>
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
        <RestaurantIcon sx={{ mr: 1, flexShrink: 0 }} />
        <Typography variant="h6" component="div" sx={{ flexShrink: 0, mr: 1 }}>
          {t('appTitle')}
        </Typography>

        {showPinSessions && <PinSessionHeaderTabs />}

        {!showPinSessions && <Box sx={{ flexGrow: 1 }} />}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto', flexShrink: 0 }}>
          {user && user.role !== 'system_admin' && user.establishment_id && (
            <TimeClockHeaderControl />
          )}
          {isHappyHourActive ? (
            <Chip
              label={t('happyHour.active')}
              color="success"
              variant="filled"
              sx={{ fontWeight: 'bold', display: { xs: 'none', sm: 'flex' } }}
            />
          ) : (
            <Chip
              label={t('happyHour.in', { time: timeUntilHappyHour })}
              color="warning"
              variant="outlined"
              sx={{ display: { xs: 'none', md: 'flex' } }}
            />
          )}

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
                        onClick={() => void handleSelect(m.establishment_id)}
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
    </AppBar>
  );
};
