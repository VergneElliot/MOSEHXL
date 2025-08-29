/**
 * Skeleton Loaders - Loading State Components
 * Beautiful skeleton loading animations for better UX
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
  styled,
  useTheme,
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
        <Box sx={{ mt: 'auto' }}>
          <AnimatedSkeleton 
            variant="rectangular" 
            width="100%" 
            height={36}
            sx={{ borderRadius: 1 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * Table Row Skeleton
 */
export const TableRowSkeleton: React.FC<{ columns: number }> = ({ columns }) => {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} style={{ padding: '16px' }}>
          <AnimatedSkeleton 
            variant="text" 
            width={index === 0 ? '60%' : '80%'} 
            height={20}
          />
        </td>
      ))}
    </tr>
  );
};

/**
 * Statistics Card Skeleton
 */
export const StatsCardSkeleton: React.FC = () => {
  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={1}>
        <AnimatedSkeleton variant="text" width="50%" height={16} />
        <AnimatedSkeleton variant="text" width="80%" height={32} />
        <AnimatedSkeleton variant="text" width="40%" height={14} />
      </Stack>
    </Card>
  );
};

/**
 * Order Item Skeleton
 */
export const OrderItemSkeleton: React.FC = () => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 2, 
        borderBottom: '1px solid #e0e0e0' 
      }}
    >
      <Box sx={{ flex: 1 }}>
        <AnimatedSkeleton variant="text" width="70%" height={20} sx={{ mb: 0.5 }} />
        <AnimatedSkeleton variant="text" width="40%" height={16} />
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <AnimatedSkeleton variant="text" width={60} height={20} sx={{ mb: 0.5 }} />
        <AnimatedSkeleton variant="text" width={40} height={16} />
      </Box>
    </Box>
  );
};

/**
 * Settings Form Skeleton
 */
export const SettingsFormSkeleton: React.FC = () => {
  return (
    <Stack spacing={3}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Box key={index}>
          <AnimatedSkeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
          <AnimatedSkeleton 
            variant="rectangular" 
            width="100%" 
            height={56}
            sx={{ borderRadius: 1 }}
          />
        </Box>
      ))}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <AnimatedSkeleton 
          variant="rectangular" 
          width={100} 
          height={36}
          sx={{ borderRadius: 1 }}
        />
        <AnimatedSkeleton 
          variant="rectangular" 
          width={100} 
          height={36}
          sx={{ borderRadius: 1 }}
        />
      </Box>
    </Stack>
  );
};

/**
 * Dashboard Widget Skeleton
 */
export const DashboardWidgetSkeleton: React.FC = () => {
  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <AnimatedSkeleton variant="text" width="40%" height={24} />
          <AnimatedSkeleton variant="circular" width={32} height={32} />
        </Box>
        <AnimatedSkeleton 
          variant="rectangular" 
          width="100%" 
          height={120}
          sx={{ borderRadius: 1 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <AnimatedSkeleton variant="text" width="30%" height={16} />
          <AnimatedSkeleton variant="text" width="20%" height={16} />
        </Box>
      </Stack>
    </Card>
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
  showAvatar = false, 
  showSecondary = true, 
  showAction = true 
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
        <AnimatedSkeleton variant="text" width="60%" height={20} />
        {showSecondary && (
          <AnimatedSkeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
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

/**
 * Navigation Skeleton
 */
export const NavigationSkeleton: React.FC = () => {
  return (
    <Stack spacing={1} sx={{ p: 1 }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Box key={index} sx={{ display: 'flex', alignItems: 'center', p: 1 }}>
          <AnimatedSkeleton 
            variant="circular" 
            width={24} 
            height={24} 
            sx={{ mr: 2 }}
          />
          <AnimatedSkeleton 
            variant="text" 
            width={index === 2 ? '60%' : '40%'} 
            height={16}
          />
        </Box>
      ))}
    </Stack>
  );
};

/**
 * Chart Skeleton
 */
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => {
  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <AnimatedSkeleton variant="text" width="30%" height={24} />
          <AnimatedSkeleton variant="text" width="15%" height={16} />
        </Box>
        <AnimatedSkeleton 
          variant="rectangular" 
          width="100%" 
          height={height}
          sx={{ borderRadius: 1 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AnimatedSkeleton variant="circular" width={12} height={12} />
              <AnimatedSkeleton variant="text" width={60} height={14} />
            </Box>
          ))}
        </Box>
      </Stack>
    </Card>
  );
};

/**
 * Receipt Skeleton
 */
export const ReceiptSkeleton: React.FC = () => {
  return (
    <Card sx={{ p: 3, maxWidth: 400 }}>
      <Stack spacing={2}>
        <Box sx={{ textAlign: 'center' }}>
          <AnimatedSkeleton variant="text" width="60%" height={24} sx={{ mx: 'auto', mb: 1 }} />
          <AnimatedSkeleton variant="text" width="80%" height={16} sx={{ mx: 'auto' }} />
        </Box>
        
        <Box sx={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', py: 2 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <AnimatedSkeleton variant="text" width="60%" height={16} />
              <AnimatedSkeleton variant="text" width="20%" height={16} />
            </Box>
          ))}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <AnimatedSkeleton variant="text" width="30%" height={20} />
          <AnimatedSkeleton variant="text" width="25%" height={20} />
        </Box>
      </Stack>
    </Card>
  );
};

/**
 * Grid Skeleton for responsive layouts
 */
export const GridSkeleton: React.FC<{
  items: number;
  columns?: { xs?: number; sm?: number; md?: number; lg?: number };
  children: React.ReactNode;
}> = ({ items, columns = { xs: 1, sm: 2, md: 3, lg: 4 }, children }) => {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: items }).map((_, index) => (
        <Grid 
          item 
          key={index}
          xs={12 / (columns.xs || 1)}
          sm={12 / (columns.sm || 2)}
          md={12 / (columns.md || 3)}
          lg={12 / (columns.lg || 4)}
        >
          {children}
        </Grid>
      ))}
    </Grid>
  );
};

/**
 * Progressive Loading Container
 */
export const ProgressiveLoader: React.FC<{
  loading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  fadeIn?: boolean;
}> = ({ loading, skeleton, children, fadeIn = true }) => {
  const theme = useTheme();
  
  if (loading) {
    return <>{skeleton}</>;
  }
  
  return (
    <Box
      sx={{
        ...(fadeIn && {
          animation: 'fadeIn 0.3s ease-in-out',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(10px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }),
      }}
    >
      {children}
    </Box>
  );
};

/**
 * Composite Skeletons for common page layouts
 */
export const PageSkeletons = {
  Dashboard: () => (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <AnimatedSkeleton variant="text" width="30%" height={32} />
        <AnimatedSkeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
      </Box>
      <GridSkeleton items={4} columns={{ xs: 1, sm: 2, md: 4 }}>
        <StatsCardSkeleton />
      </GridSkeleton>
      <GridSkeleton items={2} columns={{ xs: 1, md: 2 }}>
        <ChartSkeleton />
      </GridSkeleton>
    </Stack>
  ),
  
  ProductGrid: () => (
    <GridSkeleton items={8} columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}>
      <ProductCardSkeleton />
    </GridSkeleton>
  ),
  
  SettingsPage: () => (
    <Stack spacing={4}>
      <AnimatedSkeleton variant="text" width="25%" height={32} />
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <NavigationSkeleton />
        </Grid>
        <Grid item xs={12} md={9}>
          <SettingsFormSkeleton />
        </Grid>
      </Grid>
    </Stack>
  ),
  
  DataTable: ({ rows = 5, columns = 4 }) => (
    <Card>
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <AnimatedSkeleton variant="text" width="20%" height={24} />
          <AnimatedSkeleton variant="rectangular" width={200} height={36} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>
      <Box sx={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {Array.from({ length: rows }).map((_, index) => (
              <TableRowSkeleton key={index} columns={columns} />
            ))}
          </tbody>
        </table>
      </Box>
    </Card>
  ),
};

