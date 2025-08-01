import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip, Button } from '@mui/material';
import { Restaurant as RestaurantIcon } from '@mui/icons-material';

interface AppHeaderProps {
  isHappyHourActive: boolean;
  timeUntilHappyHour: string;
  onLogout: () => void;
  user: any;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isHappyHourActive,
  timeUntilHappyHour,
  onLogout,
  user,
}) => {
  return (
    <AppBar position="static" sx={{ backgroundColor: '#1a1a1a' }}>
      <Toolbar>
        <RestaurantIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          MuseBar POS
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isHappyHourActive ? (
            <Chip
              label="Happy Hour Active!"
              color="success"
              variant="filled"
              sx={{ fontWeight: 'bold' }}
            />
          ) : (
            <Chip
              label={`Happy Hour in ${timeUntilHappyHour}`}
              color="warning"
              variant="outlined"
            />
          )}
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'white' }}>
                {user.name}
              </Typography>
              <Button
                color="inherit"
                onClick={onLogout}
                sx={{ textTransform: 'none' }}
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