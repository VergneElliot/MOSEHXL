import React from 'react';
import { Box, Divider, Grid, Typography } from '@mui/material';
import { computeClosurePreviewTotals, type ClosurePreviewData } from './closurePreviewTotals';

interface ClosurePreviewSummaryProps {
  preview: ClosurePreviewData;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}

interface AmountCellProps {
  label: string;
  value: string;
  xs: number;
}

const AmountCell: React.FC<AmountCellProps> = ({ label, value, xs }) => (
  <Grid item xs={xs}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body1" fontWeight="bold">{value}</Typography>
  </Grid>
);

const ClosurePreviewSummary: React.FC<ClosurePreviewSummaryProps> = ({
  preview,
  formatCurrency,
  formatDate,
}) => {
  const t = computeClosurePreviewTotals(preview);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Établissement
      </Typography>
      <Typography variant="body2">{preview.business_info?.name ?? '—'}</Typography>
      <Typography variant="body2" color="text.secondary">
        {preview.business_info?.address ?? '—'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        SIRET: {preview.business_info?.siret ?? '—'} | TVA: {preview.business_info?.tax_identification ?? '—'}
      </Typography>

      <Divider sx={{ my: 1 }} />

      <Typography variant="body2">
        <strong>Type:</strong> {preview.closure_type}
      </Typography>
      <Typography variant="body2">
        <strong>Période:</strong> {formatDate(preview.period_start)} au {formatDate(preview.period_end)}
      </Typography>
      <Typography variant="body2">
        <strong>Transactions:</strong> {preview.total_transactions}
      </Typography>

      <Divider sx={{ my: 1 }} />

      <Grid container spacing={2}>
        <AmountCell xs={4} label="Total TTC" value={formatCurrency(t.totalTtc)} />
        <AmountCell xs={4} label="Total HT" value={formatCurrency(t.totalHt)} />
        <AmountCell xs={4} label="Montant total TVA" value={formatCurrency(t.totalVat)} />

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">Détail TVA (France)</Typography>
        </Grid>

        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">Total soumis à TVA 10%</Typography>
          <Typography variant="body1" fontWeight="bold">{formatCurrency(t.vat10Ttc)}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Montant TVA 10%</Typography>
          <Typography variant="body1" fontWeight="bold">{formatCurrency(t.vat10Amount)}</Typography>
        </Grid>

        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">Total soumis à TVA 20%</Typography>
          <Typography variant="body1" fontWeight="bold">{formatCurrency(t.vat20Ttc)}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Montant TVA 20%</Typography>
          <Typography variant="body1" fontWeight="bold">{formatCurrency(t.vat20Amount)}</Typography>
        </Grid>

        <AmountCell xs={6} label="Total cartes" value={formatCurrency(t.cardTotal)} />
        <AmountCell xs={6} label="Total cash" value={formatCurrency(t.cashTotal)} />
        <AmountCell xs={6} label="Pourboires (opérations tips)" value={formatCurrency(t.tipsTotal)} />
        <AmountCell xs={6} label="Monnaie rendue (faire de la monnaie)" value={formatCurrency(t.changeTotal)} />
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">Fond de caisse (informatif)</Typography>
          <Typography variant="body1" fontWeight="bold">{formatCurrency(t.fondDeCaisse)}</Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClosurePreviewSummary;
