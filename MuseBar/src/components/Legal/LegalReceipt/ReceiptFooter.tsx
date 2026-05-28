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
  documentKind = 'ticket',
  invoiceLegalInfo,
}) => {
  const summaryLabel = documentKind === 'invoice'
    ? 'Facture entreprise - Sans détail des articles'
    : 'Reçu d\'entreprise - Sans détail des articles';
  const detailedLabel = documentKind === 'invoice'
    ? 'Facture détaillée avec breakdown complet des articles et taxes'
    : 'Ticket détaillé avec breakdown complet des articles et taxes';

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
                  {summaryLabel}
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
            {detailedLabel}
          </Typography>
        </Box>
      )}

      {documentKind === 'invoice' && invoiceLegalInfo && (
        <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #eee' }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Mentions légales facture
          </Typography>
          {invoiceLegalInfo.paymentDueDate && (
            <Typography variant="caption" display="block" color="text.secondary">
              Échéance paiement: {invoiceLegalInfo.paymentDueDate}
            </Typography>
          )}
          {invoiceLegalInfo.paymentTerms && (
            <Typography variant="caption" display="block" color="text.secondary">
              Conditions paiement: {invoiceLegalInfo.paymentTerms}
            </Typography>
          )}
          {invoiceLegalInfo.latePenaltyTerms && (
            <Typography variant="caption" display="block" color="text.secondary">
              Pénalités retard: {invoiceLegalInfo.latePenaltyTerms}
            </Typography>
          )}
          {invoiceLegalInfo.recoveryFeeNote && (
            <Typography variant="caption" display="block" color="text.secondary">
              {invoiceLegalInfo.recoveryFeeNote}
            </Typography>
          )}
          {invoiceLegalInfo.sellerLegalForm && (
            <Typography variant="caption" display="block" color="text.secondary">
              Forme juridique: {invoiceLegalInfo.sellerLegalForm}
            </Typography>
          )}
          {invoiceLegalInfo.sellerShareCapitalEur !== undefined &&
            String(invoiceLegalInfo.sellerShareCapitalEur).trim() !== '' && (
              <Typography variant="caption" display="block" color="text.secondary">
                Capital social: {formatCurrency(parseFloat(String(invoiceLegalInfo.sellerShareCapitalEur)))}
              </Typography>
            )}
        </Box>
      )}
    </Box>
  );
};

export default ReceiptFooter;

