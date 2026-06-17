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
import type { InvoiceLegalInfo, Order as LegalReceiptOrder, ReceiptItem } from '../Legal/LegalReceipt/types';

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

type DocumentSelection = 'ticket' | 'invoice_detailed' | 'invoice_summary';

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
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Paiement à 30 jours');
  const [latePenaltyTerms, setLatePenaltyTerms] = useState('Pénalités de retard exigibles selon la loi');
  const [recoveryFeeNote, setRecoveryFeeNote] = useState('Indemnité forfaitaire de recouvrement: 40 EUR (C. com. art. L441-10)');
  const [sellerLegalForm, setSellerLegalForm] = useState('');
  const [sellerShareCapitalEur, setSellerShareCapitalEur] = useState('');
  const [invoiceMode, setInvoiceMode] = useState<'detailed' | 'summary'>('detailed');
  const [selectedDocument, setSelectedDocument] = useState<DocumentSelection>('ticket');
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState<string | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
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

  const isInvoiceExportUnavailable = false;
  const receiptType = selectedDocument === 'invoice_summary' ? 'summary' : 'detailed';
  const documentKind = selectedDocument === 'ticket' ? 'ticket' : 'invoice';
  const isInvoiceDocument = documentKind === 'invoice';
  const invoiceLegalInfo: InvoiceLegalInfo | undefined = isInvoiceDocument
    ? {
        paymentDueDate: paymentDueDate || undefined,
        paymentTerms: paymentTerms || undefined,
        latePenaltyTerms: latePenaltyTerms || undefined,
        recoveryFeeNote: recoveryFeeNote || undefined,
        sellerLegalForm: sellerLegalForm || undefined,
        sellerShareCapitalEur: sellerShareCapitalEur || undefined,
      }
    : undefined;

  useEffect(() => {
    if (selectedDocument === 'invoice_detailed') setInvoiceMode('detailed');
    if (selectedDocument === 'invoice_summary') setInvoiceMode('summary');
  }, [selectedDocument]);

  useEffect(() => {
    if (!open) return;
    if (paymentDueDate) return;
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setPaymentDueDate(due.toISOString().slice(0, 10));
  }, [open, paymentDueDate]);

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
    setLastInvoiceNumber(null);
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
  }, [open, hasValidOrderId, normalizedOrderId, receiptType]);

  const createOrFetchInvoice = async () => {
    if (!hasValidOrderId || normalizedOrderId === null) {
      throw new Error('Identifiant de commande invalide: facture impossible.');
    }
    if (!customerName.trim()) {
      throw new Error('Nom client requis pour créer une facture.');
    }
    if (!customerAddress.trim()) {
      throw new Error('Adresse client requise pour créer une facture.');
    }
    if (!paymentDueDate.trim()) {
      throw new Error('Échéance paiement requise pour créer une facture.');
    }
    if (!paymentTerms.trim()) {
      throw new Error('Conditions paiement requises pour créer une facture.');
    }
    if (!latePenaltyTerms.trim()) {
      throw new Error('Pénalités retard requises pour créer une facture.');
    }

    const result = await apiCore.request<{ invoice: Record<string, unknown>; already_exists?: boolean }>(
      `/legal/invoices/from-order/${normalizedOrderId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          mode: invoiceMode,
          customer: {
            name: customerName,
            address: customerAddress,
            email,
            tax_identification: customerTaxId,
          },
          legal: {
            payment_due_date: paymentDueDate,
            payment_terms: paymentTerms,
            late_penalty_terms: latePenaltyTerms,
            recovery_fee_note: recoveryFeeNote,
            seller_legal_form: sellerLegalForm,
            seller_share_capital_eur: sellerShareCapitalEur,
          },
        }),
      }
    );

    const invoice = result.invoice;
    const invoiceId = Number(invoice.id ?? 0);
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
      throw new Error('Réponse facture invalide: id manquant');
    }
    const invoiceNumber = String(invoice.invoice_number ?? '');
    if (invoiceNumber) setLastInvoiceNumber(invoiceNumber);
    const invoicePaymentDueDate = String(invoice.payment_due_date ?? '').trim();
    if (invoicePaymentDueDate) setPaymentDueDate(invoicePaymentDueDate);
    const invoicePaymentTerms = String(invoice.payment_terms ?? '').trim();
    if (invoicePaymentTerms) setPaymentTerms(invoicePaymentTerms);
    const invoiceLatePenaltyTerms = String(invoice.late_penalty_terms ?? '').trim();
    if (invoiceLatePenaltyTerms) setLatePenaltyTerms(invoiceLatePenaltyTerms);
    const invoiceRecoveryFee = String(invoice.recovery_fee_note ?? '').trim();
    if (invoiceRecoveryFee) setRecoveryFeeNote(invoiceRecoveryFee);
    const invoiceSellerLegalForm = String(invoice.seller_legal_form ?? '').trim();
    setSellerLegalForm(invoiceSellerLegalForm);
    const invoiceCapital = invoice.seller_share_capital_eur;
    if (invoiceCapital != null && String(invoiceCapital).trim() !== '') {
      setSellerShareCapitalEur(String(invoiceCapital));
    }
    return { invoiceId, invoice, alreadyExists: Boolean(result.already_exists) };
  };

  const handleQueuePrint = async () => {
    if (!hasValidOrderId || normalizedOrderId === null) {
      setError(`Identifiant de commande invalide: impression ${isInvoiceDocument ? 'facture' : 'ticket'} impossible.`);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      if (isInvoiceDocument) {
        const { invoiceId } = await createOrFetchInvoice();
        await apiCore.request(`/printing/invoice/${invoiceId}`, { method: 'POST' });
      } else {
        await apiCore.request(
          `/printing/receipt/${normalizedOrderId}?type=${receiptType}`,
          { method: 'POST' }
        );
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Échec d'impression ${isInvoiceDocument ? 'facture' : 'ticket'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!hasValidOrderId || normalizedOrderId === null) {
      setError('Identifiant de commande invalide: export PDF impossible.');
      return;
    }

    try {
      setExportingPdf(true);
      setError(null);
      setEmailSuccess(null);
      if (isInvoiceDocument) {
        const { invoiceId } = await createOrFetchInvoice();
        await printingApi.exportInvoicePdf(invoiceId);
      } else {
        await printingApi.exportReceiptPdf(normalizedOrderId, receiptType);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!hasValidOrderId || normalizedOrderId === null) {
      setError('Identifiant de commande invalide: envoi email impossible.');
      return;
    }
    if (!email.trim()) {
      setError('Adresse email destinataire requise.');
      return;
    }

    try {
      setEmailing(true);
      setError(null);
      setEmailSuccess(null);
      if (isInvoiceDocument) {
        const { invoiceId } = await createOrFetchInvoice();
        const result = await printingApi.emailInvoice(invoiceId, email.trim());
        setEmailSuccess(result.message);
      } else {
        const result = await printingApi.emailReceipt(normalizedOrderId, email.trim(), receiptType);
        setEmailSuccess(result.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec envoi email');
    } finally {
      setEmailing(false);
    }
  };

  const handleCreateInvoiceExport = async () => {
    if (!hasValidOrderId || normalizedOrderId === null) {
      setError('Identifiant de commande invalide: facture impossible.');
      return;
    }
    if (!customerName.trim()) {
      setError('Nom client requis pour créer une facture.');
      return;
    }
    if (!customerAddress.trim()) {
      setError('Adresse client requise pour créer une facture.');
      return;
    }

    try {
      setCreatingInvoice(true);
      setError(null);
      const { invoice, alreadyExists } = await createOrFetchInvoice();
      const invoiceNumber = String(invoice.invoice_number ?? `invoice-${normalizedOrderId}`);
      const payload = JSON.stringify(invoice, null, 2);
      const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoiceNumber}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      if (alreadyExists) {
        setError('Facture existante retrouvée et exportée (aucune nouvelle numérotation générée).');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de création/export facture');
    } finally {
      setCreatingInvoice(false);
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Button
                size="small"
                variant={selectedDocument === 'ticket' ? 'contained' : 'outlined'}
                onClick={() => {
                  resetAutoClose();
                  setSelectedDocument('ticket');
                }}
              >
                Ticket détaillé
              </Button>
              <Button
                size="small"
                variant={selectedDocument === 'invoice_detailed' ? 'contained' : 'outlined'}
                onClick={() => {
                  resetAutoClose();
                  setSelectedDocument('invoice_detailed');
                }}
              >
                Facture avec détail
              </Button>
              <Button
                size="small"
                variant={selectedDocument === 'invoice_summary' ? 'contained' : 'outlined'}
                onClick={() => {
                  resetAutoClose();
                  setSelectedDocument('invoice_summary');
                }}
              >
                Facture sans détail
              </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              La prévisualisation n’imprime rien. Cliquez sur “Imprimer” pour lancer
              {isInvoiceDocument ? ' la facture thermique.' : ' le ticket thermique.'}
            </Alert>

            <TextField
              fullWidth
              size="small"
              label="Email destinataire"
              value={email}
              onChange={(e) => {
                resetAutoClose();
                setEmail(e.target.value);
              }}
              placeholder="client@exemple.com"
              sx={{ mb: 2 }}
            />

            {isInvoiceDocument && (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Facture (système dédié)
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Nom client"
                  value={customerName}
                  onChange={(e) => {
                    resetAutoClose();
                    setCustomerName(e.target.value);
                  }}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Adresse client"
                  value={customerAddress}
                  onChange={(e) => {
                    resetAutoClose();
                    setCustomerAddress(e.target.value);
                  }}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="N TVA client (optionnel)"
                  value={customerTaxId}
                  onChange={(e) => {
                    resetAutoClose();
                    setCustomerTaxId(e.target.value);
                  }}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Échéance paiement"
                  value={paymentDueDate}
                  onChange={(e) => {
                    resetAutoClose();
                    setPaymentDueDate(e.target.value);
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Conditions paiement"
                  value={paymentTerms}
                  onChange={(e) => {
                    resetAutoClose();
                    setPaymentTerms(e.target.value);
                  }}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Pénalités retard"
                  value={latePenaltyTerms}
                  onChange={(e) => {
                    resetAutoClose();
                    setLatePenaltyTerms(e.target.value);
                  }}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Mention indemnité 40 EUR"
                  value={recoveryFeeNote}
                  onChange={(e) => {
                    resetAutoClose();
                    setRecoveryFeeNote(e.target.value);
                  }}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Forme juridique vendeur (optionnel)"
                  value={sellerLegalForm}
                  onChange={(e) => {
                    resetAutoClose();
                    setSellerLegalForm(e.target.value);
                  }}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Capital social EUR (optionnel)"
                  value={sellerShareCapitalEur}
                  onChange={(e) => {
                    resetAutoClose();
                    setSellerShareCapitalEur(e.target.value);
                  }}
                />
                <Button
                  sx={{ mt: 1 }}
                  variant="contained"
                  fullWidth
                  disabled={isInvoiceExportUnavailable || creatingInvoice}
                  onClick={handleCreateInvoiceExport}
                >
                  {creatingInvoice
                    ? 'Création...'
                    : `Créer et exporter facture ${invoiceMode === 'detailed' ? '(avec détail)' : '(sans détail)'}`}
                </Button>
              </>
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
        <Button
          onClick={handleExportPdf}
          variant="outlined"
          disabled={!hasValidOrderId || loading || creatingInvoice || exportingPdf || emailing}
        >
          {exportingPdf ? 'Export PDF...' : 'Exporter PDF'}
        </Button>
        <Button
          onClick={handleSendEmail}
          variant="outlined"
          disabled={!hasValidOrderId || !email.trim() || loading || creatingInvoice || emailing || exportingPdf}
        >
          {emailing ? 'Envoi...' : 'Envoyer par email'}
        </Button>
        <Button
          onClick={handleQueuePrint}
          variant="contained"
          disabled={!hasValidOrderId || loading || creatingInvoice || emailing || exportingPdf}
        >
          {isInvoiceDocument ? 'Créer et imprimer facture' : 'Imprimer ticket'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintAfterSaleDialog;

