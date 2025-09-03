/**
 * Form and Navigation Skeleton Components
 * Skeleton loaders for forms, settings, and navigation elements
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Grid,
} from '@mui/material';
import { AnimatedSkeleton } from './basicSkeletons';

/**
 * Settings Form Skeleton
 */
export const SettingsFormSkeleton: React.FC = () => {
  return (
    <Card sx={{ p: 3 }}>
      <CardContent>
        <Stack spacing={3}>
          {/* Form title */}
          <AnimatedSkeleton variant="text" width="30%" height={28} />
          
          {/* Form fields */}
          {Array.from({ length: 4 }).map((_, index) => (
            <Box key={index}>
              <AnimatedSkeleton 
                variant="text" 
                width="20%" 
                height={16} 
                sx={{ mb: 1 }}
              />
              <AnimatedSkeleton 
                variant="rectangular" 
                width="100%" 
                height={40} 
                sx={{ borderRadius: 1 }}
              />
            </Box>
          ))}
          
          {/* Form actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <AnimatedSkeleton 
              variant="rectangular" 
              width={80} 
              height={36} 
              sx={{ borderRadius: 1 }}
            />
            <AnimatedSkeleton 
              variant="rectangular" 
              width={80} 
              height={36} 
              sx={{ borderRadius: 1 }}
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

/**
 * Navigation Skeleton
 */
export const NavigationSkeleton: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={1}>
        {/* Navigation header */}
        <AnimatedSkeleton variant="text" width="60%" height={20} sx={{ mb: 2 }} />
        
        {/* Navigation items */}
        {Array.from({ length: 6 }).map((_, index) => (
          <Box 
            key={index} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 1,
              borderRadius: 1,
            }}
          >
            <AnimatedSkeleton 
              variant="rectangular" 
              width={20} 
              height={20} 
              sx={{ mr: 2, borderRadius: 0.5 }}
            />
            <AnimatedSkeleton variant="text" width="70%" height={16} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
