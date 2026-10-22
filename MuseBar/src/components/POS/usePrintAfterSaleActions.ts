import type { InvoiceFormState } from './printAfterSaleInvoice';
import {
  createInvoiceFromOrder,
  emailAfterSaleDocument,
  exportAfterSalePdf,
  queueInvoicePrint,
  queueReceiptPrint,
} from './printAfterSaleApi';

function downloadInvoiceJson(invoice: Record<string, unknown>, filename: string): void {
  const blob = new Blob([JSON.stringify(invoice, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

interface UsePrintAfterSaleActionsArgs {
  normalizedOrderId: number | null;
  form: InvoiceFormState;
  invoiceMode: 'detailed' | 'summary';
  receiptType: 'detailed' | 'summary';
  selectedSubBillId: number | null;
  isInvoiceDocument: boolean;
  onClose: () => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  setExportingPdf: (value: boolean) => void;
  setEmailing: (value: boolean) => void;
  setEmailSuccess: (value: string | null) => void;
  setCreatingInvoice: (value: boolean) => void;
  setLastInvoiceNumber: (value: string | null) => void;
}

export function usePrintAfterSaleActions({
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
}: UsePrintAfterSaleActionsArgs) {
  const createOrFetchInvoice = async () => {
    if (normalizedOrderId == null) throw new Error('Identifiant de commande invalide');
    const result = await createInvoiceFromOrder(
      normalizedOrderId,
      form,
      invoiceMode,
      selectedSubBillId
    );
    const invoiceNumber = String(result.invoice.invoice_number ?? '');
    if (invoiceNumber) setLastInvoiceNumber(invoiceNumber);
    return result;
  };

  const handleQueuePrint = async () => {
    if (normalizedOrderId == null) return;
    try {
      setLoading(true);
      setError(null);
      if (isInvoiceDocument) {
        const { invoiceId } = await createOrFetchInvoice();
        await queueInvoicePrint(invoiceId);
      } else {
        await queueReceiptPrint(normalizedOrderId, receiptType, selectedSubBillId);
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
        await exportAfterSalePdf(true, invoiceId, normalizedOrderId, receiptType, selectedSubBillId);
      } else {
        await exportAfterSalePdf(false, null, normalizedOrderId, receiptType, selectedSubBillId);
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
      const email = form.email.trim();
      if (isInvoiceDocument) {
        const { invoiceId } = await createOrFetchInvoice();
        const message = await emailAfterSaleDocument(
          true, invoiceId, normalizedOrderId, email, receiptType, selectedSubBillId
        );
        setEmailSuccess(message);
      } else {
        const message = await emailAfterSaleDocument(
          false, null, normalizedOrderId, email, receiptType, selectedSubBillId
        );
        setEmailSuccess(message);
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
      downloadInvoiceJson(invoice, `${invoiceNumber}.json`);
      if (alreadyExists) {
        setError('Facture existante retrouvée et exportée.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec export facture');
    } finally {
      setCreatingInvoice(false);
    }
  };

  return {
    handleQueuePrint,
    handleExportPdf,
    handleSendEmail,
    handleCreateInvoiceExport,
  };
}
