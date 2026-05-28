import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Typography,
} from '@mui/material';
import { apiCore } from '../../services/api';

type ClosurePreviewData = {
  id: number;
  closure_type: string;
  period_start: string;
  period_end: string;
  total_transactions: number;
  fond_de_caisse: number;
  total_amount: number;
  total_vat: number;
  vat_breakdown: {
    vat_10?: { amount?: number; vat?: number; ttc?: number };
    vat_20?: { amount?: number; vat?: number; ttc?: number };
  };
  payment_methods_breakdown: { [key: string]: number };
  tips_total?: number;
  change_total?: number;
  business_info?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    siret?: string;
    tax_identification?: string;
  };
};

interface PrintClosureDialogProps {
  open: boolean;
  bulletinId: number | null;
  onClose: () => void;
  onPrintSuccess: (message: string) => void;
  onPrintError: (message: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function roundToCents(amount: number): number {
  return Math.round(amount * 100);
}

const PrintClosureDialog: React.FC<PrintClosureDialogProps> = ({
  open,
  bulletinId,
  onClose,
  onPrintSuccess,
  onPrintError,
  formatCurrency,
  formatDate,
}) => {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClosurePreviewData | null>(null);

  const hasValidId = useMemo(() => Number.isFinite(bulletinId) && (bulletinId ?? 0) > 0, [bulletinId]);

  useEffect(() => {
    if (!open) return;
    if (!hasValidId || bulletinId == null) {
      setPreview(null);
      setError('Identifiant de bulletin invalide.');
      return;
    }

    setLoadingPreview(true);
    setError(null);
    setPreview(null);

    (async () => {
      try {
        const data = await apiCore.request<{ bulletin_data: ClosurePreviewData }>(
          `/printing/closure/${bulletinId}/preview`,
          { method: 'GET' }
        );
        setPreview(data.bulletin_data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Impossible de charger l’aperçu du bulletin');
      } finally {
        setLoadingPreview(false);
      }
    })();
  }, [open, hasValidId, bulletinId]);

  const handlePrint = async () => {
    if (!hasValidId || bulletinId == null) {
      setError('Identifiant de bulletin invalide.');
      return;
    }

    try {
      setPrinting(true);
      setError(null);
      await apiCore.request(`/printing/closure/${bulletinId}`, { method: 'POST' });
      onPrintSuccess('Impression du bulletin envoyée à la file avec succès.');
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Échec de la mise en file de l’impression';
      setError(message);
      onPrintError(message);
    } finally {
      setPrinting(false);
    }
  };

  const handleExport = async () => {
    if (!preview) return;
    try {
      setExporting(true);
      const payload = JSON.stringify(preview, null, 2);
      const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `closure-bulletin-${preview.id}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      onPrintSuccess('Export du bulletin téléchargé (.json).');
    } catch {
      onPrintError('Échec de l’export du bulletin.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Impression du bulletin de clôture</DialogTitle>
      <DialogContent dividers>
        {loadingPreview && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loadingPreview && !error && preview && (
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

            {(() => {
              const totalTtc = toNumber(preview.total_amount);
              const cardTotal = toNumber(preview.payment_methods_breakdown?.card);
              const cashTotal = toNumber(preview.payment_methods_breakdown?.cash);
              const tipsTotal = toNumber(preview.tips_total);
              const changeTotal = toNumber(preview.change_total);
              const fondDeCaisse = toNumber(preview.fond_de_caisse);

              const vat10Base = toNumber(preview.vat_breakdown?.vat_10?.amount);
              const vat20Base = toNumber(preview.vat_breakdown?.vat_20?.amount);
              const vat10Amount = toNumber(preview.vat_breakdown?.vat_10?.vat);
              const vat20Amount = toNumber(preview.vat_breakdown?.vat_20?.vat);

              const vat10TtcExact = toNumber(preview.vat_breakdown?.vat_10?.ttc) || vat10Base + vat10Amount;
              const vat20TtcExact = toNumber(preview.vat_breakdown?.vat_20?.ttc) || vat20Base + vat20Amount;

              const vat10TtcDisplay = roundToCents(vat10TtcExact) / 100;
              const vat20TtcDisplay = roundToCents(vat20TtcExact) / 100;
              const vat10AmountCents = roundToCents(vat10Amount);
              const vat20AmountCents = roundToCents(vat20Amount);
              const vat10AmountDisplay = vat10AmountCents / 100;
              const vat20AmountDisplay = vat20AmountCents / 100;

              const ttcTotalCents = roundToCents(totalTtc);
              const vatTotalCents = vat10AmountCents + vat20AmountCents;

              return (
                <>
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
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Total TTC</Typography>
                      <Typography variant="body1" fontWeight="bold">{formatCurrency(totalTtc)}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Total HT</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatCurrency((ttcTotalCents - vatTotalCents) / 100)}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Montant total TVA</Typography>
                      <Typography variant="body1" fontWeight="bold">{formatCurrency(vatTotalCents / 100)}</Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" color="text.secondary">Détail TVA (France)</Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Total soumis à TVA 10%</Typography>
                      <Typography variant="body1" fontWeight="bold">{formatCurrency(vat10TtcDisplay)}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Montant TVA 10%</Typography>
                      <Typography variant="body1" fontWeight="bold">{formatCurrency(vat10AmountDisplay)}</Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Total soumis à TVA 20%</Typography>
                      <Typography variant="body1" fontWeight="bold">{formatCurrency(vat20TtcDisplay)}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Montant TVA 20%</Typography>
                      <Typography variant="body1" fontWeight="bold">{formatCurrency(vat20AmountDisplay)}</Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Total cartes</Typography>
                      <Typography variant="body1" fontWeight="bold">{formatCurrency(cardTotal)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Total cash</Typography>
                      <Typography variant="body1" fontWeight="bold">{formatCurrency(cashTotal)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Pourboires (opérations tips)</Typography>
                      <Typography variant="body1" fontWeight="bold">{formatCurrency(tipsTotal)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Monnaie rendue (faire de la monnaie)</Typography>
                      <Typography variant="body1" fontWeight="bold">{formatCurrency(changeTotal)}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" color="text.secondary">Fond de caisse (informatif)</Typography>
                      <Typography variant="body1" fontWeight="bold">{formatCurrency(fondDeCaisse)}</Typography>
                    </Grid>
                  </Grid>
                </>
              );
            })()}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button onClick={handleExport} variant="outlined" disabled={loadingPreview || exporting || !preview}>
          {exporting ? 'Export...' : 'Exporter'}
        </Button>
        <Button onClick={handlePrint} variant="contained" disabled={loadingPreview || printing || !!error || !preview}>
          {printing ? 'Impression...' : 'Imprimer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintClosureDialog;
