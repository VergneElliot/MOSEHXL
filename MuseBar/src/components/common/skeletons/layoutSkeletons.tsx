/**
 * Layout and Grid Skeleton Components
 * Skeleton loaders for grids, pages, and complex layouts
 */

import React from 'react';
import {
  Box,
  Grid,
  Container,
} from '@mui/material';
import { AnimatedSkeleton } from './basicSkeletons';
import { ProductCardSkeleton } from './basicSkeletons';
import { StatsCardSkeleton } from './dashboardSkeletons';
import { ListItemSkeleton } from './basicSkeletons';

/**
 * Grid Skeleton
 */
export const GridSkeleton: React.FC<{
  items: number;
  columns?: { xs?: number; sm?: number; md?: number; lg?: number };
  spacing?: number;
  renderItem?: () => React.ReactNode;
}> = ({ 
  items, 
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  spacing = 2,
  renderItem = () => <ProductCardSkeleton />
}) => {
  return (
    <Grid container spacing={spacing}>
      {Array.from({ length: items }).map((_, index) => (
        <Grid 
          item 
          key={index}
          xs={columns.xs}
          sm={columns.sm}
          md={columns.md}
          lg={columns.lg}
        >
          {renderItem()}
        </Grid>
      ))}
    </Grid>
  );
};

/**
 * Page Skeletons Collection
 * Common page layout skeletons
 */
export const PageSkeletons = {
  /**
   * Dashboard Page Skeleton
   */
  dashboard: () => (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <AnimatedSkeleton variant="text" width="30%" height={32} sx={{ mb: 3 }} />
      <Grid container spacing={3}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatsCardSkeleton />
          </Grid>
        ))}
        <Grid item xs={12} md={8}>
          <AnimatedSkeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: 1 }} />
        </Grid>
        <Grid item xs={12} md={4}>
          <AnimatedSkeleton variant="rectangular" width="100%" height={400} sx={{ borderRadius: 1 }} />
        </Grid>
      </Grid>
    </Container>
  ),

  /**
   * Product Grid Page Skeleton
   */
  productGrid: () => (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <AnimatedSkeleton variant="text" width="20%" height={32} />
        <AnimatedSkeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
      </Box>
      <GridSkeleton items={12} />
    </Container>
  ),

  /**
   * List Page Skeleton
   */
  list: () => (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <AnimatedSkeleton variant="text" width="25%" height={32} sx={{ mb: 3 }} />
      {Array.from({ length: 8 }).map((_, index) => (
        <ListItemSkeleton key={index} showAvatar showSecondary showAction />
      ))}
    </Container>
  ),

  /**
   * Form Page Skeleton
   */
  form: () => (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <AnimatedSkeleton variant="text" width="40%" height={32} sx={{ mb: 3 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Box key={index}>
            <AnimatedSkeleton variant="text" width="20%" height={16} sx={{ mb: 1 }} />
            <AnimatedSkeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <AnimatedSkeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
          <AnimatedSkeleton variant="rectangular" width={80} height={36} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>
    </Container>
  ),
};
