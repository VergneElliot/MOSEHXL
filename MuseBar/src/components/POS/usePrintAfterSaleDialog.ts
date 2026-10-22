import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { InvoiceLegalInfo, Order as LegalReceiptOrder } from '../Legal/LegalReceipt/types';
import {
  initialInvoiceFormState,
  type InvoiceFormState,
} from './printAfterSaleInvoice';
import type { SplitPartOption } from './PrintAfterSaleSplitPicker';
import type { BusinessInfo } from './printAfterSalePreview';
import { loadOrderSplitParts, loadReceiptPreview } from './printAfterSaleApi';
import { usePrintAfterSaleActions } from './usePrintAfterSaleActions';

export type DocumentSelection = 'ticket' | 'invoice_detailed' | 'invoice_summary';

export function parseOrderId(orderId: number | string | null): number | null {
  if (typeof orderId === 'number' && Number.isFinite(orderId) && orderId > 0) return orderId;
  if (typeof orderId === 'string' && /^\d+$/.test(orderId.trim())) {
    const parsed = parseInt(orderId.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

interface UsePrintAfterSaleDialogArgs {
  open: boolean;
  orderId: number | string | null;
  autoCloseEnabled: boolean;
  autoCloseMs: number;
  onClose: () => void;
}

export function usePrintAfterSaleDialog({
  open,
  orderId,
  autoCloseEnabled,
  autoCloseMs,
  onClose,
}: UsePrintAfterSaleDialogArgs) {
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
  const invoiceMode: 'detailed' | 'summary' =
    selectedDocument === 'invoice_summary' ? 'summary' : 'detailed';
  const receiptType = invoiceMode;
  const isInvoiceDocument = selectedDocument !== 'ticket';
  const documentKind: 'invoice' | 'ticket' = isInvoiceDocument ? 'invoice' : 'ticket';

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
        const parts = await loadOrderSplitParts(normalizedOrderId);
        if (!cancelled) setSplitParts(parts);
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
    (async () => {
      try {
        const normalized = await loadReceiptPreview(
          normalizedOrderId,
          receiptType,
          selectedSubBillId
        );
        setPreview(normalized.order);
        setBusinessInfo(normalized.businessInfo);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, hasValidOrderId, normalizedOrderId, receiptType, selectedSubBillId]);

  const {
    handleQueuePrint,
    handleExportPdf,
    handleSendEmail,
    handleCreateInvoiceExport,
  } = usePrintAfterSaleActions({
    normalizedOrderId,
    form,
    invoiceMode,
    receiptType,
    selectedSubBillId,
    isInvoiceDocument,
    onClose,
    setLoading,
    setError,
    setExportingPdf,
    setEmailing,
    setEmailSuccess,
    setCreatingInvoice,
    setLastInvoiceNumber,
  });

  const busy = loading || creatingInvoice || emailing || exportingPdf;

  return {
    loading,
    preview,
    businessInfo,
    error,
    form,
    extrasOpen,
    selectedDocument,
    lastInvoiceNumber,
    creatingInvoice,
    emailing,
    exportingPdf,
    emailSuccess,
    splitParts,
    selectedSubBillId,
    hasValidOrderId,
    invoiceMode,
    receiptType,
    isInvoiceDocument,
    documentKind,
    invoiceLegalInfo,
    busy,
    patchForm,
    resetAutoClose,
    setExtrasOpen,
    setSelectedDocument,
    setSelectedSubBillId,
    setLastInvoiceNumber,
    handleQueuePrint,
    handleExportPdf,
    handleSendEmail,
    handleCreateInvoiceExport,
  };
}
