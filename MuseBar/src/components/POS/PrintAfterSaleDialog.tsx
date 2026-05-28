import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  TextField,
} from '@mui/material';
import { apiCore } from '../../services/api';
import LegalReceiptContainer from '../Legal/LegalReceipt/LegalReceiptContainer';
import type { Order as LegalReceiptOrder, ReceiptItem } from '../Legal/LegalReceipt/types';

type BusinessInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret?: string;
  taxIdentification?: string;
};

type PreviewReceiptOrder = LegalReceiptOrder;

type PreviewPayload = {
  order: PreviewReceiptOrder;
  businessInfo: BusinessInfo;
};

function normalizeReceiptForPreview(raw: unknown): PreviewPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const rawRecord = raw as Record<string, unknown>;

  const toNumber = (v: unknown) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : 0;
  };

  const items = Array.isArray(rawRecord.items) ? rawRecord.items : [];
  const normalizedItems: ReceiptItem[] = items.map((it) => {
    const item = typeof it === 'object' && it !== null ? (it as Record<string, unknown>) : {};
    const unit = toNumber(item.unit_price);
    const total = toNumber(item.total_price);

    // Backend tax_rate might be 0.2 or 20 depending on source. UI expects percent number like 20.
    const rateRaw = toNumber(item.tax_rate);
    const ratePercent = rateRaw > 0 && rateRaw <= 1 ? rateRaw * 100 : rateRaw;
    const rate = ratePercent / 100;

    const taxAmount = toNumber(item.tax_amount) || (total * rate) / (1 + rate);

    return {
      ...item,
      name: String(item.name ?? item.product_name ?? ''),
      product_name: String(item.product_name ?? item.name ?? ''),
      quantity: toNumber(item.quantity) || 1,
      unit_price: unit,
      total_price: total,
      tax_rate: ratePercent,
      tax_amount: taxAmount,
      happy_hour_applied: Boolean(item.happy_hour_applied) || false,
      happy_hour_discount_amount: toNumber(item.happy_hour_discount_amount),
    };
  });

  const businessInfoRaw =
    typeof rawRecord.business_info === 'object' && rawRecord.business_info !== null
      ? (rawRecord.business_info as Record<string, unknown>)
      : {};

  return {
    order: {
      id: toNumber(rawRecord.order_id ?? rawRecord.id),
      sequence_number: toNumber(rawRecord.sequence_number ?? 0),
      total_amount: toNumber(rawRecord.total_amount),
      total_tax: toNumber(rawRecord.total_tax),
      payment_method: String(rawRecord.payment_method ?? ''),
      created_at: String(rawRecord.created_at ?? new Date().toISOString()),
      items: normalizedItems,
      vat_breakdown: Array.isArray(rawRecord.vat_breakdown) ? rawRecord.vat_breakdown : [],
    },
    businessInfo: {
      name: String(businessInfoRaw.name ?? ''),
      address: String(businessInfoRaw.address ?? ''),
      phone: String(businessInfoRaw.phone ?? ''),
      email: String(businessInfoRaw.email ?? ''),
      siret: String(businessInfoRaw.siret ?? ''),
      taxIdentification: String(businessInfoRaw.tax_identification ?? businessInfoRaw.taxIdentification ?? ''),
    },
  };
}

export interface PrintAfterSaleDialogProps {
  open: boolean;
  orderId: number | string | null;
  autoCloseEnabled?: boolean;
  autoCloseMs?: number;
  onClose: () => void;
}

export const PrintAfterSaleDialog: React.FC<PrintAfterSaleDialogProps> = ({
  open,
  orderId,
  autoCloseEnabled = true,
  autoCloseMs = 8000,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewReceiptOrder | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const autoCloseTimerRef = useRef<number | null>(null);

  const normalizedOrderId = useMemo<number | null>(() => {
    if (typeof orderId === 'number' && Number.isFinite(orderId) && orderId > 0) {
      return orderId;
    }
    if (typeof orderId === 'string') {
      const trimmed = orderId.trim();
      if (!/^\d+$/.test(trimmed)) {
        return null;
      }
      const parsed = parseInt(trimmed, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return null;
  }, [orderId]);

  const hasValidOrderId = useMemo(() => normalizedOrderId !== null, [normalizedOrderId]);

  const isPdfFeatureUnavailable = true;
  const receiptType = 'detailed' as const;

  const resetAutoClose = useCallback(() => {
    if (!open || !autoCloseEnabled) return;
    if (autoCloseTimerRef.current != null) {
      window.clearTimeout(autoCloseTimerRef.current);
    }
    autoCloseTimerRef.current = window.setTimeout(() => onClose(), autoCloseMs);
  }, [open, autoCloseEnabled, autoCloseMs, onClose]);

  useEffect(() => {
    if (!open || !autoCloseEnabled) return;
    resetAutoClose();
    return () => {
      if (autoCloseTimerRef.current != null) {
        window.clearTimeout(autoCloseTimerRef.current);
      }
      autoCloseTimerRef.current = null;
    };
  }, [open, autoCloseEnabled, resetAutoClose]);

  useEffect(() => {
    if (!open) return;
    if (!hasValidOrderId) {
      setPreview(null);
      setBusinessInfo(null);
      setLoading(false);
      setError('Identifiant de commande invalide: aperçu impossible.');
      return;
    }

    setError(null);
    setLoading(true);
    setPreview(null);

    (async () => {
      try {
        // Preview-only: does not queue a print job.
        const data = await apiCore.request<{ receipt_data: unknown }>(
          `/printing/receipt/${normalizedOrderId}/preview?type=${receiptType}`,
          { method: 'GET' }
        );
        const normalized = normalizeReceiptForPreview(data.receipt_data);
        if (!normalized) throw new Error('Invalid preview payload');
        setPreview(normalized.order);
        setBusinessInfo(normalized.businessInfo);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, hasValidOrderId, normalizedOrderId]);

  const handleQueuePrint = async () => {
    if (!hasValidOrderId || normalizedOrderId === null) {
      setError('Identifiant de commande invalide: impression impossible.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await apiCore.request(
        `/printing/receipt/${normalizedOrderId}?type=${receiptType}`,
        { method: 'POST' }
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to queue print');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      onMouseMove={autoCloseEnabled ? resetAutoClose : undefined}
      onMouseDown={autoCloseEnabled ? resetAutoClose : undefined}
      onKeyDown={autoCloseEnabled ? resetAutoClose : undefined}
      onFocus={autoCloseEnabled ? resetAutoClose : undefined}
    >
      <DialogTitle>Imprimer / Envoyer</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Choisir un document
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Ticket détaillé (unique format disponible pour le moment).
            </Alert>

            <Alert severity="info" sx={{ mb: 2 }}>
              La prévisualisation n’imprime rien. Cliquez sur “Imprimer” pour mettre en file un ticket.
              Les factures légales dédiées seront livrées dans une étape séparée.
            </Alert>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Export (PDF par email)
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="Email"
              value={email}
              onChange={(e) => {
                resetAutoClose();
                setEmail(e.target.value);
              }}
              placeholder="client@example.com"
            />
            <Button
              sx={{ mt: 1 }}
              variant="outlined"
              fullWidth
              disabled={isPdfFeatureUnavailable}
              title="À implémenter: génération PDF + envoi email"
            >
              Envoyer PDF
            </Button>
          </Box>

          <Box sx={{ flex: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Aperçu
            </Typography>
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            )}
            {error && <Alert severity="error">{error}</Alert>}
            {!loading && !error && preview && businessInfo && (
              <LegalReceiptContainer
                order={preview}
                businessInfo={{
                  name: businessInfo.name,
                  address: businessInfo.address,
                  phone: businessInfo.phone,
                  email: businessInfo.email,
                  siret: businessInfo.siret ?? '',
                  taxIdentification: businessInfo.taxIdentification ?? '',
                }}
                receiptType={receiptType}
              />
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button onClick={handleQueuePrint} variant="contained" disabled={!hasValidOrderId || !!error || loading}>
          Imprimer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintAfterSaleDialog;

