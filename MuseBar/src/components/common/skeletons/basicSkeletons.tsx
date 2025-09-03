/**
 * Basic Skeleton Components
 * Core skeleton loaders for products, tables, and lists
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  styled,
  useTheme,
  Avatar,
} from '@mui/material';

/**
 * Animated Skeleton Wrapper
 */
const AnimatedSkeleton = styled(Skeleton)(({ theme }) => ({
  '&::after': {
    animationDuration: '1.5s',
  },
  borderRadius: theme.spacing(1),
}));

/**
 * Product Card Skeleton
 */
export const ProductCardSkeleton: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
        height: 200,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s',
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AnimatedSkeleton 
          variant="text" 
          width="80%" 
          height={24} 
          sx={{ mb: 1 }}
        />
        <AnimatedSkeleton 
          variant="text" 
          width="60%" 
          height={16} 
          sx={{ mb: 2 }}
        />
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <AnimatedSkeleton variant="text" width={60} height={20} />
          <AnimatedSkeleton 
            variant="rectangular" 
            width={80} 
            height={32} 
            sx={{ borderRadius: theme.spacing(0.5) }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

/**
 * Table Row Skeleton
 */
export const TableRowSkeleton: React.FC<{ columns: number }> = ({ columns }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', py: 1, px: 2 }}>
      {Array.from({ length: columns }).map((_, index) => (
        <Box key={index} sx={{ flex: 1, mx: 1 }}>
          <AnimatedSkeleton variant="text" width="80%" />
        </Box>
      ))}
    </Box>
  );
};

/**
 * List Item Skeleton
 */
export const ListItemSkeleton: React.FC<{ 
  showAvatar?: boolean;
  showSecondary?: boolean;
  showAction?: boolean;
}> = ({ 
  showAvatar = true, 
  showSecondary = true, 
  showAction = false 
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
      {showAvatar && (
        <AnimatedSkeleton 
          variant="circular" 
          width={40} 
          height={40} 
          sx={{ mr: 2 }}
        />
      )}
      <Box sx={{ flex: 1 }}>
        <AnimatedSkeleton 
          variant="text" 
          width="70%" 
          height={20} 
          sx={{ mb: showSecondary ? 0.5 : 0 }}
        />
        {showSecondary && (
          <AnimatedSkeleton variant="text" width="50%" height={16} />
        )}
      </Box>
      {showAction && (
        <AnimatedSkeleton 
          variant="rectangular" 
          width={80} 
          height={32} 
          sx={{ borderRadius: 1 }}
        />
      )}
    </Box>
  );
};

export { AnimatedSkeleton };
