import React from 'react';
import { Box, Card, CardContent, Grid, Skeleton } from '@mui/material';

interface SkeletonWrapperProps {
  loading?: boolean;
  children: React.ReactNode;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | false;
  count?: number;
}

export const SkeletonWrapper: React.FC<SkeletonWrapperProps> = ({
  loading = true,
  children,
  variant = 'rectangular',
  width = '100%',
  height = 40,
  animation = 'wave',
  count = 1,
}) => {
  if (!loading) return <>{children}</>;

  return (
    <Box>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          variant={variant}
          width={width}
          height={height}
          animation={animation}
          sx={{ mb: count > 1 ? 1 : 0 }}
        />
      ))}
    </Box>
  );
};

export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <Grid container spacing={2}>
    {Array.from({ length: count }).map((_, index) => (
      <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
        <Card>
          <Skeleton variant="rectangular" height={140} />
          <CardContent>
            <Skeleton variant="text" height={24} width="80%" />
            <Skeleton variant="text" height={20} width="60%" />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Skeleton variant="text" height={20} width="40%" />
              <Skeleton variant="rectangular" height={24} width="60px" />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

export const OrderSummarySkeleton: React.FC = () => (
  <Card>
    <CardContent>
      <Skeleton variant="text" height={28} width="60%" sx={{ mb: 2 }} />
      {Array.from({ length: 3 }).map((_, index) => (
        <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Skeleton variant="text" height={20} width="70%" />
          <Skeleton variant="text" height={20} width="50px" />
        </Box>
      ))}
      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="text" height={24} width="40%" />
          <Skeleton variant="text" height={24} width="60px" />
        </Box>
        <Skeleton variant="rectangular" height={40} width="100%" />
      </Box>
    </CardContent>
  </Card>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <Box>
    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} variant="text" height={32} width="100%" />
      ))}
    </Box>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box key={rowIndex} sx={{ display: 'flex', gap: 2, mb: 1 }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="text" height={24} width="100%" />
        ))}
      </Box>
    ))}
  </Box>
);


