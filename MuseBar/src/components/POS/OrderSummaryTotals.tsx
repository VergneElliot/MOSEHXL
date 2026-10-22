import React from 'react';
import { Box, Divider, Typography } from '@mui/material';

const totalLabelSx = {
  fontWeight: 800,
  fontSize: { xs: '1rem', sm: '1.1rem', md: '1.15rem' },
  lineHeight: 1.1,
} as const;

const totalValueSx = {
  fontWeight: 900,
  fontSize: { xs: '1.45rem', sm: '1.7rem', md: '1.9rem' },
  lineHeight: 1.1,
} as const;

interface OrderSummaryTotalsProps {
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
  tipsTotal?: number;
  formatCurrency: (amount: number) => string;
}

const OrderSummaryTotals: React.FC<OrderSummaryTotalsProps> = ({
  orderTotal,
  orderTax,
  orderSubtotal,
  tipsTotal = 0,
  formatCurrency,
}) => (
  <Box sx={{ flexShrink: 0, pt: 1 }}>
    <Divider sx={{ mb: 1 }} />
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75} flexWrap="wrap" gap={0.5}>
      <Typography variant="body2">
        Sous-total HT:{' '}
        <Box component="span" sx={{ fontWeight: 600 }}>
          {formatCurrency(orderSubtotal - orderTax)}
        </Box>
      </Typography>
      <Typography variant="body2">
        TVA:{' '}
        <Box component="span" sx={{ fontWeight: 600 }}>
          {formatCurrency(orderTax)}
        </Box>
      </Typography>
    </Box>
    <Box display="flex" justifyContent="space-between">
      <Typography variant="h6" sx={totalLabelSx}>
        Total TTC:
      </Typography>
      <Typography variant="h6" color="primary" sx={totalValueSx}>
        {formatCurrency(orderTotal)}
      </Typography>
    </Box>
    {tipsTotal > 0 && (
      <Box display="flex" justifyContent="space-between" mt={0.5}>
        <Typography variant="body2" color="text.secondary">
          Pourboire carte (hors CA):
        </Typography>
        <Typography variant="body2" color="secondary" fontWeight={700}>
          {formatCurrency(tipsTotal)}
        </Typography>
      </Box>
    )}
  </Box>
);

export default OrderSummaryTotals;
