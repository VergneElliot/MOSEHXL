/**
 * Receipt Header Component
 * Displays business information and basic receipt details
 */

import React from 'react';
import { Box, Typography, Divider, Grid } from '@mui/material';
import { Business } from '@mui/icons-material';
import { ReceiptHeaderProps } from './types';
import { formatDate, getPaymentMethodDisplayName } from './utils';

/**
 * Receipt Header Component
 */
export const ReceiptHeader: React.FC<ReceiptHeaderProps> = ({
  businessInfo,
  order,
  receiptType = 'detailed',
}) => {
  return (
    <>
      {/* Business Information Header */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Business sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
        <Typography variant="h6" fontWeight="bold">
          {businessInfo.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {businessInfo.address}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tél: {businessInfo.phone}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {businessInfo.email}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Receipt Information */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              N° Ticket:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">
              {order.sequence_number.toString().padStart(6, '0')}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              Date/Heure:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">
              {formatDate(order.created_at)}
            </Typography>
          </Grid>

          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              Mode Paiement:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">
              {getPaymentMethodDisplayName(order.payment_method)}
            </Typography>
          </Grid>

          {receiptType === 'detailed' && (
            <>
              <Grid item xs={6}>
                <Typography variant="body2" fontWeight="bold">
                  Type:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">Ticket détaillé</Typography>
              </Grid>
            </>
          )}

          {receiptType === 'summary' && (
            <>
              <Grid item xs={6}>
                <Typography variant="body2" fontWeight="bold">
                  Type:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">Reçu d'entreprise</Typography>
              </Grid>
            </>
          )}
        </Grid>
      </Box>

      <Divider sx={{ my: 2 }} />
    </>
  );
};

export default ReceiptHeader;

