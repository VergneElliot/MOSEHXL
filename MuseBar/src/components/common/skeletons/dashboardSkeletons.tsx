/**
 * Dashboard and Stats Skeleton Components
 * Skeleton loaders for dashboard widgets, stats cards, and charts
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Stack,
} from '@mui/material';
import { AnimatedSkeleton } from './basicSkeletons';

/**
 * Stats Card Skeleton
 */
export const StatsCardSkeleton: React.FC = () => {
  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={1}>
        <AnimatedSkeleton variant="text" width="60%" height={16} />
        <AnimatedSkeleton variant="text" width="40%" height={32} />
        <AnimatedSkeleton variant="text" width="80%" height={14} />
      </Stack>
    </Card>
  );
};

/**
 * Dashboard Widget Skeleton
 */
export const DashboardWidgetSkeleton: React.FC = () => {
  return (
    <Card sx={{ p: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <AnimatedSkeleton variant="text" width="40%" height={24} />
            <AnimatedSkeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
          </Box>
          
          {/* Content */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <AnimatedSkeleton variant="text" width="100%" height={20} />
              <AnimatedSkeleton variant="text" width="80%" height={16} sx={{ mt: 0.5 }} />
            </Grid>
            <Grid item xs={6}>
              <AnimatedSkeleton variant="text" width="100%" height={20} />
              <AnimatedSkeleton variant="text" width="60%" height={16} sx={{ mt: 0.5 }} />
            </Grid>
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
};

/**
 * Chart Skeleton
 */
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => {
  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2}>
        {/* Chart title */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <AnimatedSkeleton variant="text" width="30%" height={20} />
          <AnimatedSkeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
        </Box>
        
        {/* Chart area */}
        <AnimatedSkeleton 
          variant="rectangular" 
          width="100%" 
          height={height} 
          sx={{ borderRadius: 1 }}
        />
        
        {/* Legend */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AnimatedSkeleton variant="rectangular" width={12} height={12} />
              <AnimatedSkeleton variant="text" width={60} height={14} />
            </Box>
          ))}
        </Box>
      </Stack>
    </Card>
  );
};
