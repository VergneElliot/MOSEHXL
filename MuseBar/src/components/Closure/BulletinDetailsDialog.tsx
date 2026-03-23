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
                {formatCurrency(totalHt)}
              </Typography>
            </Grid>

            <Grid item xs={6} md={4}>
              <Typography variant="caption" color="textSecondary">
                Total taxes (TVA)
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(totalVat)}
              </Typography>
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

