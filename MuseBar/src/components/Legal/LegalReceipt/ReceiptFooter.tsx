/**
 * Receipt Footer Component
 * Displays VAT breakdown, totals, and summary information
 */

import React from 'react';
import { Box, Typography, Grid, Divider } from '@mui/material';
import { ReceiptFooterProps } from './types';
import { formatCurrency, getVatRate } from './utils';

/**
 * Receipt Footer Component
 */
export const ReceiptFooter: React.FC<ReceiptFooterProps> = ({
  order,
  vatBreakdown,
  totalVAT,
  sousTotalHT,
  receiptType = 'detailed',
}) => {
  return (
    <Box sx={{ mt: 2 }}>
      {/* VAT Breakdown */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          BREVET D'IMPÔT SUR LA VALEUR AJOUTÉE (TVA)
        </Typography>
        
        <Grid container spacing={1}>
          {vatBreakdown.map((vatItem, index) => {
            const rate = getVatRate(vatItem);
            return (
              <React.Fragment key={index}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Base HT ({rate}%): {formatCurrency(parseFloat(String(vatItem.subtotal_ht)))}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    TVA {rate}%: {formatCurrency(parseFloat(String(vatItem.vat)))}
                  </Typography>
                </Grid>
              </React.Fragment>
            );
          })}
          
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              Sous-total HT: {formatCurrency(sousTotalHT)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              TVA Totale: {formatCurrency(totalVAT)}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Final Total */}
      <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="h6" fontWeight="bold">
              TOTAL TTC:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="h6" fontWeight="bold" sx={{ textAlign: 'right' }}>
              {formatCurrency(parseFloat(String(order.total_amount)))}
            </Typography>
          </Grid>
          
          {receiptType === 'summary' && (
            <>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Reçu d'entreprise - Sans détail des articles
                </Typography>
              </Grid>
            </>
          )}
        </Grid>
      </Box>

      {/* Receipt Type Information */}
      {receiptType === 'detailed' && (
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Ticket détaillé avec breakdown complet des articles et taxes
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ReceiptFooter;

