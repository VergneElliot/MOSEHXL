import React from 'react';
import { Card, CardContent, Typography, Box, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { SvgIconComponent } from '@mui/icons-material';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: SvgIconComponent;
  route: string;
  color: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  icon: Icon,
  route,
  color
}) => {
  const navigate = useNavigate();

  return (
    <Card 
      sx={{ 
        height: '100%', 
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        }
      }}
      onClick={() => navigate(route)}
    >
      <CardContent sx={{ textAlign: 'center', p: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Icon sx={{ fontSize: 40, color }} />
        </Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <IconButton 
          sx={{ 
            backgroundColor: color,
            color: 'white',
            '&:hover': {
              backgroundColor: color,
              opacity: 0.8
            }
          }}
        >
          <ArrowForwardIcon />
        </IconButton>
      </CardContent>
    </Card>
  );
};