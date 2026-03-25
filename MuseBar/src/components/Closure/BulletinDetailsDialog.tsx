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

function allocateRoundedCents(exactAmounts: number[], targetTotalCents: number): number[] {
  const exactCents = exactAmounts.map((a) => (Number.isFinite(a) ? a * 100 : 0));
  const floored = exactCents.map((c) => Math.floor(c));
  const remainders = exactCents.map((c, idx) => ({ idx, r: c - floored[idx] }));

  const sumFloored = floored.reduce((s, v) => s + v, 0);
  let missing = targetTotalCents - sumFloored;

  // Distribute missing cents to biggest remainders (or remove from smallest if negative)
  remainders.sort((a, b) => (missing >= 0 ? b.r - a.r : a.r - b.r));
  const out = [...floored];

  for (let i = 0; i < remainders.length && missing !== 0; i++) {
    const { idx } = remainders[i];
    out[idx] += missing >= 0 ? 1 : -1;
    missing += missing >= 0 ? -1 : 1;
  }

  return out;
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
  const totalSoumisTVA = vat10Base + vat20Base;

  // Display-safe rounding: ensure the rounded 10%+20% lines add up to the rounded totals.
  const baseTotalCents = roundToCents(Number.isFinite(totalSoumisTVA) && totalSoumisTVA > 0 ? totalSoumisTVA : totalHt);
  const [vat10BaseCents, vat20BaseCents] = allocateRoundedCents([vat10Base, vat20Base], baseTotalCents);

  const vatTotalCents = roundToCents(totalVat);
  const [vat10AmountCents, vat20AmountCents] = allocateRoundedCents([vat10Amount, vat20Amount], vatTotalCents);

  const vat10BaseDisplay = vat10BaseCents / 100;
  const vat20BaseDisplay = vat20BaseCents / 100;
  const vat10AmountDisplay = vat10AmountCents / 100;
  const vat20AmountDisplay = vat20AmountCents / 100;

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
                Total soumis à TVA (HT)
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(Number.isFinite(totalSoumisTVA) && totalSoumisTVA > 0 ? totalSoumisTVA : totalHt)}
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
                  {formatCurrency(vat10BaseDisplay)}
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
                  {formatCurrency(vat20BaseDisplay)}
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

