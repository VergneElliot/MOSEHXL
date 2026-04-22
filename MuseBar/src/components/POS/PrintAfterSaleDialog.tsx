import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  CircularProgress,
  Alert,
  TextField,
} from '@mui/material';
import { apiCore } from '../../services/api';
import LegalReceiptContainer from '../Legal/LegalReceipt/LegalReceiptContainer';

type PrintDocType = 'receipt' | 'invoice_detailed' | 'invoice_summary';

type BusinessInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret?: string;
  taxIdentification?: string;
};

function normalizeReceiptForPreview(raw: any) {
  if (!raw || typeof raw !== 'object') return null;

  const toNumber = (v: any) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : 0;
  };

  const items = Array.isArray(raw.items) ? raw.items : [];
  const normalizedItems = items.map((it: any) => {
    const unit = toNumber(it.unit_price);
    const total = toNumber(it.total_price);

    // Backend tax_rate might be 0.2 or 20 depending on source. UI expects percent number like 20.
    const rateRaw = toNumber(it.tax_rate);
    const ratePercent = rateRaw > 0 && rateRaw <= 1 ? rateRaw * 100 : rateRaw;
    const rate = ratePercent / 100;

    const taxAmount = toNumber(it.tax_amount) || (total * rate) / (1 + rate);

    return {
      ...it,
      name: it.name ?? it.product_name ?? '',
      product_name: it.product_name ?? it.name ?? '',
      quantity: toNumber(it.quantity) || 1,
      unit_price: unit,
      total_price: total,
      tax_rate: ratePercent,
      tax_amount: taxAmount,
      happy_hour_applied: Boolean(it.happy_hour_applied) || false,
      happy_hour_discount_amount: toNumber(it.happy_hour_discount_amount),
    };
  });

  const businessInfoRaw = raw.business_info ?? {};

  return {
    order: {
      id: toNumber(raw.order_id ?? raw.id),
      sequence_number: toNumber(raw.sequence_number ?? 0),
      total_amount: toNumber(raw.total_amount),
      total_tax: toNumber(raw.total_tax),
      payment_method: String(raw.payment_method ?? ''),
      created_at: String(raw.created_at ?? new Date().toISOString()),
      items: normalizedItems,
      vat_breakdown: raw.vat_breakdown ?? [],
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
  orderId: number | null;
  autoCloseMs?: number;
  onClose: () => void;
}

export const PrintAfterSaleDialog: React.FC<PrintAfterSaleDialogProps> = ({
  open,
  orderId,
  autoCloseMs = 8000,
  onClose,
}) => {
  const [docType, setDocType] = useState<PrintDocType>('receipt');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const autoCloseTimerRef = useRef<number | null>(null);

  const receiptType = useMemo<'detailed' | 'summary'>(() => {
    if (docType === 'invoice_summary') return 'summary';
    return 'detailed';
  }, [docType]);

  const resetAutoClose = useCallback(() => {
    if (!open) return;
    if (autoCloseTimerRef.current != null) {
      window.clearTimeout(autoCloseTimerRef.current);
    }
    autoCloseTimerRef.current = window.setTimeout(() => onClose(), autoCloseMs);
  }, [open, autoCloseMs, onClose]);

  useEffect(() => {
    if (!open) return;
    resetAutoClose();
    return () => {
      if (autoCloseTimerRef.current != null) {
        window.clearTimeout(autoCloseTimerRef.current);
      }
      autoCloseTimerRef.current = null;
    };
  }, [open, resetAutoClose]);

  useEffect(() => {
    if (!open || !orderId) return;
    setError(null);
    setLoading(true);
    setPreview(null);

    (async () => {
      try {
        // Preview-only: does not queue a print job.
        const data = await apiCore.request<{ receipt_data: any }>(
          `/printing/receipt/${orderId}/preview?type=${receiptType}`,
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
  }, [open, orderId, receiptType]);

  const handleQueuePrint = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      await apiCore.request(
        `/printing/receipt/${orderId}?type=${receiptType}`,
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
      onMouseMove={resetAutoClose}
      onMouseDown={resetAutoClose}
      onKeyDown={resetAutoClose}
      onFocus={resetAutoClose}
    >
      <DialogTitle>Imprimer / Envoyer</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Choisir un document
            </Typography>
            <ToggleButtonGroup
              value={docType}
              exclusive
              onChange={(_, v) => {
                resetAutoClose();
                if (v) setDocType(v);
              }}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
            >
              <ToggleButton value="receipt">Ticket</ToggleButton>
              <ToggleButton value="invoice_detailed">Facture détaillée</ToggleButton>
              <ToggleButton value="invoice_summary">Facture simple</ToggleButton>
            </ToggleButtonGroup>

            <Alert severity="info" sx={{ mb: 2 }}>
              La prévisualisation n’imprime rien. Cliquez sur “Imprimer” pour mettre en file un ticket.
              Les vraies factures + PDF/email seront ajoutées ensuite (backend manquant).
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
              disabled
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
        <Button onClick={handleQueuePrint} variant="contained" disabled={!orderId || !!error || loading}>
          Imprimer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintAfterSaleDialog;

