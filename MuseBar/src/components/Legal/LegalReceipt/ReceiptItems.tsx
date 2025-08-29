/**
 * Receipt Items Component
 * Displays the list of items in the receipt
 */

import React from 'react';
import { Box, Typography, Grid, Chip } from '@mui/material';
import { LocalOffer } from '@mui/icons-material';
import { ReceiptItemsProps } from './types';
import { formatCurrency } from './utils';

/**
 * Receipt Items Component
 */
export const ReceiptItems: React.FC<ReceiptItemsProps> = ({
  items,
  showHappyHour = true,
}) => {
  // Ensure items is always an array
  const validItems = Array.isArray(items) ? items : [];

  if (validItems.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Aucun article dans cette commande
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
        ARTICLES
      </Typography>
      
      {validItems.map((item, index) => (
        <Box key={index} sx={{ mb: 1.5 }}>
          <Grid container spacing={1}>
            {/* Item Name and Description */}
            <Grid item xs={12}>
              <Typography variant="body2" fontWeight="bold">
                {item.product_name || item.name}
              </Typography>
              {item.description && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {item.description}
                </Typography>
              )}
            </Grid>

            {/* Quantity and Unit Price */}
            <Grid item xs={6}>
              <Typography variant="body2">
                Quantité: {item.quantity}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                Prix unitaire: {formatCurrency(item.unit_price)}
              </Typography>
            </Grid>

            {/* Tax Rate */}
            <Grid item xs={6}>
              <Typography variant="body2">
                TVA: {item.tax_rate}%
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                Montant TVA: {formatCurrency(item.tax_amount)}
              </Typography>
            </Grid>

            {/* Happy Hour Information */}
            {showHappyHour && item.happy_hour_applied && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <LocalOffer sx={{ fontSize: 16, color: 'success.main' }} />
                  <Chip
                    size="small"
                    label={`Happy Hour: -${formatCurrency(item.happy_hour_discount_amount)}`}
                    color="success"
                    variant="outlined"
                  />
                </Box>
              </Grid>
            )}

            {/* Total Price */}
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'right', mt: 0.5 }}>
                <Typography variant="body2" fontWeight="bold">
                  Total: {formatCurrency(item.total_price)}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Divider between items */}
          {index < validItems.length - 1 && (
            <Box sx={{ borderBottom: '1px dashed #ccc', mt: 1 }} />
          )}
        </Box>
      ))}
    </Box>
  );
};

export default ReceiptItems;

