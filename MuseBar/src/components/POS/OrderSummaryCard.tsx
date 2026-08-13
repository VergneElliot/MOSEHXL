import React from 'react';
import { Card, CardContent, Divider, Grid, Typography } from '@mui/material';

interface OrderSummaryCardProps {
  orderSubtotal: number;
  orderTax: number;
  orderTotal: number;
  formatCurrency: (amount: number) => string;
  /** TVA 10% (TTC tax portion). */
  tax10?: number;
  /** TVA 20% (TTC tax portion). */
  tax20?: number;
  /** Shown once the split is valid / complete. */
  cashTotal?: number | null;
  cardTotal?: number | null;
  showPaymentBreakdown?: boolean;
}

const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({
  orderSubtotal,
  orderTax,
  orderTotal,
  formatCurrency,
  tax10 = 0,
  tax20 = 0,
  cashTotal = null,
  cardTotal = null,
  showPaymentBreakdown = false,
}) => {
  return (
    <Card sx={{ mt: 2, mb: 1 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Résumé de la commande
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4}>
            <Typography variant="body2" color="textSecondary">
              Sous-total (HT)
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {formatCurrency(orderSubtotal - orderTax)}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="body2" color="textSecondary">
              TVA 10 %
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {formatCurrency(tax10)}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Typography variant="body2" color="textSecondary">
              TVA 20 %
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {formatCurrency(tax20)}
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
          {showPaymentBreakdown && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                Répartition des paiements
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Espèces
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrency(cashTotal ?? 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Carte
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatCurrency(cardTotal ?? 0)}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default OrderSummaryCard;
