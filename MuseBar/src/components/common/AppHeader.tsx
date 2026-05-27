import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip, Button } from '@mui/material';
import { Restaurant as RestaurantIcon } from '@mui/icons-material';
import { User } from '../../types/auth';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

interface AppHeaderProps {
  isHappyHourActive: boolean;
  timeUntilHappyHour: string;
  onLogout: () => void;
  user: User | null;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isHappyHourActive,
  timeUntilHappyHour,
  onLogout,
  user,
}) => {
  const { t } = useTranslation('common');

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1a1a1a' }}>
      <Toolbar>
        <RestaurantIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {t('appTitle')}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LanguageSwitcher />
          {isHappyHourActive ? (
            <Chip
              label={t('happyHour.active')}
              color="success"
              variant="filled"
              sx={{ fontWeight: 'bold' }}
            />
          ) : (
            <Chip
              label={t('happyHour.in', { time: timeUntilHappyHour })}
              color="warning"
              variant="outlined"
            />
          )}
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'white' }}>
                {user.first_name} {user.last_name}
              </Typography>
              <Button
                color="inherit"
                onClick={onLogout}
                sx={{ textTransform: 'none' }}
              >
                {t('auth.logout')}
              </Button>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}; 