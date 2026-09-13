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
import { apiCore, printingApi } from '../../services/api';
import LegalReceiptContainer from '../Legal/LegalReceipt/LegalReceiptContainer';
import type { InvoiceLegalInfo, Order as LegalReceiptOrder } from '../Legal/LegalReceipt/types';
import {
  buildInvoiceCreateBody,
  initialInvoiceFormState,
  type InvoiceFormState,
} from './printAfterSaleInvoice';
import { PrintAfterSaleInvoiceExtras } from './PrintAfterSaleInvoiceExtras';
import {
  PrintAfterSaleSplitPicker,
  type SplitPartOption,
} from './PrintAfterSaleSplitPicker';
import { normalizeReceiptForPreview, type BusinessInfo } from './printAfterSalePreview';

type DocumentSelection = 'ticket' | 'invoice_detailed' | 'invoice_summary';

export interface PrintAfterSaleDialogProps {
  open: boolean;
  orderId: number | string | null;
  autoCloseEnabled?: boolean;
  autoCloseMs?: number;
  onClose: () => void;
}

function parseOrderId(orderId: number | string | null): number | null {
  if (typeof orderId === 'number' && Number.isFinite(orderId) && orderId > 0) return orderId;
  if (typeof orderId === 'string' && /^\d+$/.test(orderId.trim())) {
    const parsed = parseInt(orderId.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export const PrintAfterSaleDialog: React.FC<PrintAfterSaleDialogProps> = ({
  open,
  orderId,
  autoCloseEnabled = true,
  autoCloseMs = 8000,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<LegalReceiptOrder | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<InvoiceFormState>(initialInvoiceFormState);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentSelection>('ticket');
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState<string | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [splitParts, setSplitParts] = useState<SplitPartOption[]>([]);
  const [selectedSubBillId, setSelectedSubBillId] = useState<number | null>(null);
  const autoCloseTimerRef = useRef<number | null>(null);

  const normalizedOrderId = useMemo(() => parseOrderId(orderId), [orderId]);
  const hasValidOrderId = normalizedOrderId != null;
  const invoiceMode = selectedDocument === 'invoice_summary' ? 'summary' : 'detailed';
  const receiptType = invoiceMode;
  const isInvoiceDocument = selectedDocument !== 'ticket';
  const documentKind = isInvoiceDocument ? 'invoice' : 'ticket';

  const invoiceLegalInfo: InvoiceLegalInfo | undefined = isInvoiceDocument
    ? {
        paymentDueDate: form.paymentDueDate || undefined,
        paymentTerms: form.paymentTerms || undefined,
        latePenaltyTerms: form.latePenaltyTerms || undefined,
        recoveryFeeNote: form.recoveryFeeNote || undefined,
        sellerLegalForm: form.sellerLegalForm || undefined,
        sellerShareCapitalEur: form.sellerShareCapitalEur || undefined,
      }
    : undefined;

  const patchForm = useCallback((patch: Partial<InvoiceFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetAutoClose = useCallback(() => {
    if (!open || !autoCloseEnabled) return;
    if (autoCloseTimerRef.current != null) window.clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = window.setTimeout(() => onClose(), autoCloseMs);
  }, [open, autoCloseEnabled, autoCloseMs, onClose]);

  useEffect(() => {
    if (!open || !autoCloseEnabled) return;
    resetAutoClose();
    return () => {
      if (autoCloseTimerRef.current != null) window.clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    };
  }, [open, autoCloseEnabled, resetAutoClose]);

  useEffect(() => {
    if (!open) return;
    setLastInvoiceNumber(null);
    setForm(initialInvoiceFormState());
    setExtrasOpen(false);
    setSelectedSubBillId(null);
    setEmailSuccess(null);
  }, [open, normalizedOrderId]);

  useEffect(() => {
    if (!open || !hasValidOrderId || normalizedOrderId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const order = await apiCore.request<{
          payment_method?: string;
          sub_bills?: Array<{ id: number; payment_method: string; amount: number | string }>;
        }>(`/orders/${normalizedOrderId}`, { method: 'GET' });
        if (cancelled) return;
        const parts =
          order.payment_method === 'split' && Array.isArray(order.sub_bills)
            ? order.sub_bills.map((b) => ({
                id: Number(b.id),
                payment_method: String(b.payment_method),
                amount: typeof b.amount === 'number' ? b.amount : parseFloat(String(b.amount)),
              }))
            : [];
        setSplitParts(parts.filter((p) => Number.isFinite(p.id) && p.id > 0));
      } catch {
        if (!cancelled) setSplitParts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, hasValidOrderId, normalizedOrderId]);

  useEffect(() => {
    if (!open) return;
    if (!hasValidOrderId || normalizedOrderId == null) {
      setPreview(null);
      setBusinessInfo(null);
      setLoading(false);
      setError('Identifiant de commande invalide: aperçu impossible.');
      return;
    }
    setError(null);
    setLoading(true);
    setPreview(null);
    const qs = new URLSearchParams({ type: receiptType });
    if (selectedSubBillId != null) qs.set('sub_bill_id', String(selectedSubBillId));
    (async () => {
      try {
        const data = await apiCore.request<{ receipt_data: unknown }>(
          `/printing/receipt/${normalizedOrderId}/preview?${qs.toString()}`,
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
  }, [open, hasValidOrderId, normalizedOrderId, receiptType, selectedSubBillId]);

  const createOrFetchInvoice = async () => {
    if (normalizedOrderId == null) throw new Error('Identifiant de commande invalide');
    const result = await apiCore.request<{ invoice: Record<string, unknown>; already_exists?: boolean }>(
      `/legal/invoices/from-order/${normalizedOrderId}`,
      {
        method: 'POST',
        body: JSON.stringify(buildInvoiceCreateBody(form, invoiceMode, selectedSubBillId)),
      }
    );
    const invoice = result.invoice;
    const invoiceId = Number(invoice.id ?? 0);
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
      throw new Error('Réponse facture invalide: id manquant');
    }
    const invoiceNumber = String(invoice.invoice_number ?? '');
    if (invoiceNumber) setLastInvoiceNumber(invoiceNumber);
    return { invoiceId, invoice, alreadyExists: Boolean(result.already_exists) };
  };

  const subBillQuery =
    selectedSubBillId != null ? `?type=${receiptType}&sub_bill_id=${selectedSubBillId}` : `?type=${receiptType}`;

  const handleQueuePrint = async () => {
    if (normalizedOrderId == null) return;
    try {
      setLoading(true);
      setError(null);
      if (isInvoiceDocument) {
        const { invoiceId } = await createOrFetchInvoice();
        await apiCore.request(`/printing/invoice/${invoiceId}`, { method: 'POST' });
      } else {
        await apiCore.request(`/printing/receipt/${normalizedOrderId}${subBillQuery}`, {
          method: 'POST',
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec impression');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (normalizedOrderId == null) return;
    try {
      setExportingPdf(true);
      setError(null);
      if (isInvoiceDocument) {
        const { invoiceId } = await createOrFetchInvoice();
        await printingApi.exportInvoicePdf(invoiceId);
      } else {
        await printingApi.exportReceiptPdf(
          normalizedOrderId,
          receiptType,
          selectedSubBillId ?? undefined
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (normalizedOrderId == null) return;
    if (!form.email.trim()) {
      setError('Adresse email destinataire requise.');
      return;
    }
    try {
      setEmailing(true);
      setError(null);
      setEmailSuccess(null);
      if (isInvoiceDocument) {
        const { invoiceId } = await createOrFetchInvoice();
        const result = await printingApi.emailInvoice(invoiceId, form.email.trim());
        setEmailSuccess(result.message);
      } else {
        const result = await printingApi.emailReceipt(
          normalizedOrderId,
          form.email.trim(),
          receiptType,
          selectedSubBillId ?? undefined
        );
        setEmailSuccess(result.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec envoi email');
    } finally {
      setEmailing(false);
    }
  };

  const handleCreateInvoiceExport = async () => {
    if (normalizedOrderId == null) return;
    try {
      setCreatingInvoice(true);
      setError(null);
      const { invoice, alreadyExists } = await createOrFetchInvoice();
      const invoiceNumber = String(invoice.invoice_number ?? `invoice-${normalizedOrderId}`);
      const blob = new Blob([JSON.stringify(invoice, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoiceNumber}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      if (alreadyExists) {
        setError('Facture existante retrouvée et exportée.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec export facture');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const busy = loading || creatingInvoice || emailing || exportingPdf;

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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {(
                [
                  ['ticket', 'Ticket détaillé'],
                  ['invoice_detailed', 'Facture avec détail'],
                  ['invoice_summary', 'Facture sans détail'],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  size="small"
                  variant={selectedDocument === value ? 'contained' : 'outlined'}
                  onClick={() => {
                    resetAutoClose();
                    setSelectedDocument(value);
                  }}
                >
                  {label}
                </Button>
              ))}
            </Box>

            <PrintAfterSaleSplitPicker
              parts={splitParts}
              selectedId={selectedSubBillId}
              onSelect={(id) => {
                resetAutoClose();
                setSelectedSubBillId(id);
                setLastInvoiceNumber(null);
              }}
            />

            <Alert severity="info" sx={{ mb: 2 }}>
              {isInvoiceDocument
                ? 'Un clic sur Imprimer crée la facture (client « Client » par défaut) puis lance l’impression.'
                : 'La prévisualisation n’imprime rien. Cliquez sur Imprimer pour le ticket thermique.'}
            </Alert>

            <TextField
              fullWidth
              size="small"
              label="Email destinataire"
              value={form.email}
              onChange={(e) => {
                resetAutoClose();
                patchForm({ email: e.target.value });
              }}
              placeholder="client@exemple.com"
              sx={{ mb: 2 }}
            />

            {isInvoiceDocument && (
              <PrintAfterSaleInvoiceExtras
                open={extrasOpen}
                onToggle={() => {
                  resetAutoClose();
                  setExtrasOpen((v) => !v);
                }}
                form={form}
                onChange={(patch) => {
                  resetAutoClose();
                  patchForm(patch);
                }}
                invoiceMode={invoiceMode}
                creatingInvoice={creatingInvoice}
                onExportJson={() => void handleCreateInvoiceExport()}
              />
            )}
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
            {emailSuccess && <Alert severity="success">{emailSuccess}</Alert>}
            {!loading && preview && businessInfo && (
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
                documentKind={documentKind}
                documentNumber={documentKind === 'invoice' ? lastInvoiceNumber ?? undefined : undefined}
                invoiceLegalInfo={invoiceLegalInfo}
              />
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button onClick={() => void handleExportPdf()} variant="outlined" disabled={!hasValidOrderId || busy}>
          {exportingPdf ? 'Export PDF...' : 'Exporter PDF'}
        </Button>
        <Button
          onClick={() => void handleSendEmail()}
          variant="outlined"
          disabled={!hasValidOrderId || !form.email.trim() || busy}
        >
          {emailing ? 'Envoi...' : 'Envoyer par email'}
        </Button>
        <Button
          onClick={() => void handleQueuePrint()}
          variant="contained"
          disabled={!hasValidOrderId || busy}
        >
          {isInvoiceDocument ? 'Créer et imprimer facture' : 'Imprimer ticket'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintAfterSaleDialog;
