import React from 'react';
import { Card, CardContent, Divider, Grid, Typography } from '@mui/material';

interface OrderSummaryCardProps {
  orderSubtotal: number;
  orderTax: number;
  orderTotal: number;
  formatCurrency: (amount: number) => string;
}

const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({ orderSubtotal, orderTax, orderTotal, formatCurrency }) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Résumé de la commande
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              Sous-total (HT)
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {formatCurrency(orderSubtotal)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="textSecondary">
              TVA
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {formatCurrency(orderTax)}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Grid container justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Total (TTC)</Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(orderTotal)}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default OrderSummaryCard;


