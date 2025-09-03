/**
 * Transaction and Receipt Skeleton Components
 * Skeleton loaders for orders, receipts, and transaction-related UI
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Divider,
} from '@mui/material';
import { AnimatedSkeleton } from './basicSkeletons';

/**
 * Order Item Skeleton
 */
export const OrderItemSkeleton: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      {/* Product image placeholder */}
      <AnimatedSkeleton 
        variant="rectangular" 
        width={60} 
        height={60} 
        sx={{ mr: 2, borderRadius: 1 }}
      />
      
      {/* Product details */}
      <Box sx={{ flex: 1 }}>
        <AnimatedSkeleton variant="text" width="80%" height={20} sx={{ mb: 0.5 }} />
        <AnimatedSkeleton variant="text" width="60%" height={16} sx={{ mb: 1 }} />
        <AnimatedSkeleton variant="text" width="40%" height={14} />
      </Box>
      
      {/* Price and actions */}
      <Box sx={{ textAlign: 'right' }}>
        <AnimatedSkeleton variant="text" width={60} height={20} sx={{ mb: 1 }} />
        <AnimatedSkeleton 
          variant="rectangular" 
          width={80} 
          height={24} 
          sx={{ borderRadius: 0.5 }}
        />
      </Box>
    </Box>
  );
};

/**
 * Receipt Skeleton
 */
export const ReceiptSkeleton: React.FC = () => {
  return (
    <Card sx={{ maxWidth: 400, mx: 'auto', p: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          {/* Header */}
          <Box sx={{ textAlign: 'center' }}>
            <AnimatedSkeleton variant="text" width="60%" height={24} sx={{ mx: 'auto', mb: 1 }} />
            <AnimatedSkeleton variant="text" width="80%" height={16} sx={{ mx: 'auto' }} />
          </Box>
          
          <Divider />
          
          {/* Order items */}
          {Array.from({ length: 3 }).map((_, index) => (
            <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1 }}>
                <AnimatedSkeleton variant="text" width="70%" height={16} />
                <AnimatedSkeleton variant="text" width="50%" height={14} />
              </Box>
              <AnimatedSkeleton variant="text" width={50} height={16} />
            </Box>
          ))}
          
          <Divider />
          
          {/* Totals */}
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <AnimatedSkeleton variant="text" width={80} height={16} />
              <AnimatedSkeleton variant="text" width={60} height={16} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <AnimatedSkeleton variant="text" width={60} height={16} />
              <AnimatedSkeleton variant="text" width={50} height={16} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <AnimatedSkeleton variant="text" width={70} height={20} />
              <AnimatedSkeleton variant="text" width={70} height={20} />
            </Box>
          </Stack>
          
          <Divider />
          
          {/* Footer */}
          <Box sx={{ textAlign: 'center' }}>
            <AnimatedSkeleton variant="text" width="40%" height={14} sx={{ mx: 'auto' }} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
