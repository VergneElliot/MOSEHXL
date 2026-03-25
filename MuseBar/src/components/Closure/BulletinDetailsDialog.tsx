import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Typography,
  Divider,
} from '@mui/material';
import type { ClosureBulletin } from '../../types';

interface BulletinDetailsDialogProps {
  open: boolean;
  bulletin: ClosureBulletin | null;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}

function toFiniteNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function roundToCents(amount: number): number {
  // cents as integer to avoid float drift in UI sums
  return Math.round(amount * 100);
}

const BulletinDetailsDialog: React.FC<BulletinDetailsDialogProps> = ({
  open,
  bulletin,
  onClose,
  formatCurrency,
  formatDate,
}) => {
  if (!bulletin) return null;

  const totalTtc = toFiniteNumber(bulletin.total_amount);
  const totalVat = toFiniteNumber(bulletin.total_vat);
  const totalHt = totalTtc - totalVat;

  const cardTotal = toFiniteNumber(bulletin.payment_methods_breakdown?.card);
  const cashTotal = toFiniteNumber(bulletin.payment_methods_breakdown?.cash);

  const tipsTotal = toFiniteNumber(bulletin.tips_total);
  const changeTotal = toFiniteNumber(bulletin.change_total);

  const vat10Base = toFiniteNumber(bulletin.vat_breakdown?.vat_10?.amount);
  const vat20Base = toFiniteNumber(bulletin.vat_breakdown?.vat_20?.amount);
  const vat10Amount = toFiniteNumber(bulletin.vat_breakdown?.vat_10?.vat);
  const vat20Amount = toFiniteNumber(bulletin.vat_breakdown?.vat_20?.vat);

  // "Total soumis à TVA X%" must be the exact TTC sum of all items in that VAT bucket.
  // Prefer backend-provided TTC bucket totals (sum of order_items.total_price), fallback to base+vat.
  const vat10TtcExact = toFiniteNumber((bulletin.vat_breakdown as any)?.vat_10?.ttc) || vat10Base + vat10Amount;
  const vat20TtcExact = toFiniteNumber((bulletin.vat_breakdown as any)?.vat_20?.ttc) || vat20Base + vat20Amount;

  // Round only for display, never "rebalance" buckets (accounting wants the bucket sums themselves).
  const vat10TtcDisplay = roundToCents(vat10TtcExact) / 100;
  const vat20TtcDisplay = roundToCents(vat20TtcExact) / 100;
  const vat10AmountDisplay = roundToCents(vat10Amount) / 100;
  const vat20AmountDisplay = roundToCents(vat20Amount) / 100;

  const ttcTotalCents = roundToCents(totalTtc);
  const vatTotalCents = roundToCents(totalVat);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Détails du bulletin</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              Période
            </Typography>
            <Typography variant="body1">
              {formatDate(bulletin.period_start)} au {formatDate(bulletin.period_end)}
            </Typography>
          </Box>

          <Divider />

          <Grid container spacing={2}>
            <Grid item xs={6} md={4}>
              <Typography variant="caption" color="textSecondary">
                Total TTC
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(totalTtc)}
              </Typography>
            </Grid>

            <Grid item xs={6} md={4}>
              <Typography variant="caption" color="textSecondary">
                Total HT
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency((ttcTotalCents - vatTotalCents) / 100)}
              </Typography>
            </Grid>

            <Grid item xs={6} md={4}>
              <Typography variant="caption" color="textSecondary">
                Montant total TVA
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(totalVat)}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="textSecondary">
                Détail TVA (France)
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="caption" color="textSecondary">
                  Total soumis à TVA 10%
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatCurrency(vat10TtcDisplay)}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                  Montant TVA 10%
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatCurrency(vat10AmountDisplay)}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="caption" color="textSecondary">
                  Total soumis à TVA 20%
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatCurrency(vat20TtcDisplay)}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                  Montant TVA 20%
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatCurrency(vat20AmountDisplay)}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={6} md={6}>
              <Typography variant="caption" color="textSecondary">
                Total cartes
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(cardTotal)}
              </Typography>
            </Grid>

            <Grid item xs={6} md={6}>
              <Typography variant="caption" color="textSecondary">
                Total cash
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(cashTotal)}
              </Typography>
            </Grid>

            <Grid item xs={6} md={6}>
              <Typography variant="caption" color="textSecondary">
                Pourboires (opérations tips)
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(tipsTotal)}
              </Typography>
            </Grid>

            <Grid item xs={6} md={6}>
              <Typography variant="caption" color="textSecondary">
                Monnaie rendue (faire de la monnaie)
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(changeTotal)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default BulletinDetailsDialog;

