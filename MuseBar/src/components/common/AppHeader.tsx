import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip, Button, useMediaQuery } from '@mui/material';
import { Restaurant as RestaurantIcon } from '@mui/icons-material';
import { User } from '../../types/auth';

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
  const isShortScreen = useMediaQuery('(max-height: 900px)');

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1a1a1a' }}>
      <Toolbar
        variant={isShortScreen ? 'dense' : 'regular'}
        sx={{
          minHeight: isShortScreen ? '44px !important' : undefined,
          px: isShortScreen ? 1.5 : 2,
        }}
      >
        <RestaurantIcon sx={{ mr: 1, fontSize: isShortScreen ? 18 : 24 }} />
        <Typography variant={isShortScreen ? 'body1' : 'h6'} component="div" sx={{ flexGrow: 1 }}>
          MuseBar POS
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: isShortScreen ? 1 : 2 }}>
          {isHappyHourActive ? (
            <Chip
              label="Happy Hour Active!"
              color="success"
              variant="filled"
              size={isShortScreen ? 'small' : 'medium'}
              sx={{ fontWeight: 'bold', height: isShortScreen ? 22 : undefined }}
            />
          ) : (
            <Chip
              label={`Happy Hour in ${timeUntilHappyHour}`}
              color="warning"
              variant="outlined"
              size={isShortScreen ? 'small' : 'medium'}
              sx={{ height: isShortScreen ? 22 : undefined }}
            />
          )}
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant={isShortScreen ? 'caption' : 'body2'} sx={{ color: 'white' }}>
                {user.first_name} {user.last_name}
              </Typography>
              <Button
                color="inherit"
                onClick={onLogout}
                size={isShortScreen ? 'small' : 'medium'}
                sx={{ textTransform: 'none', minWidth: isShortScreen ? 56 : undefined, px: isShortScreen ? 1 : 1.5 }}
              >
                Logout
              </Button>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}; 