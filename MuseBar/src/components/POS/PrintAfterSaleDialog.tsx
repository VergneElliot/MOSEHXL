import React from 'react';
import { Dialog, DialogTitle, DialogContent, Box } from '@mui/material';
import { usePrintAfterSaleDialog } from './usePrintAfterSaleDialog';
import PrintAfterSaleDocumentPanel from './PrintAfterSaleDocumentPanel';
import PrintAfterSalePreview from './PrintAfterSalePreview';
import PrintAfterSaleActions from './PrintAfterSaleActions';

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
  const dialog = usePrintAfterSaleDialog({
    open,
    orderId,
    autoCloseEnabled,
    autoCloseMs,
    onClose,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      onMouseMove={autoCloseEnabled ? dialog.resetAutoClose : undefined}
      onMouseDown={autoCloseEnabled ? dialog.resetAutoClose : undefined}
      onKeyDown={autoCloseEnabled ? dialog.resetAutoClose : undefined}
      onFocus={autoCloseEnabled ? dialog.resetAutoClose : undefined}
    >
      <DialogTitle>Imprimer / Envoyer</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
          <PrintAfterSaleDocumentPanel
            selectedDocument={dialog.selectedDocument}
            isInvoiceDocument={dialog.isInvoiceDocument}
            invoiceMode={dialog.invoiceMode}
            splitParts={dialog.splitParts}
            selectedSubBillId={dialog.selectedSubBillId}
            form={dialog.form}
            extrasOpen={dialog.extrasOpen}
            creatingInvoice={dialog.creatingInvoice}
            onSelectDocument={dialog.setSelectedDocument}
            onSelectSubBill={(id) => {
              dialog.setSelectedSubBillId(id);
              dialog.setLastInvoiceNumber(null);
            }}
            onPatchForm={dialog.patchForm}
            onToggleExtras={() => dialog.setExtrasOpen((v) => !v)}
            onExportJson={() => void dialog.handleCreateInvoiceExport()}
            onInteract={dialog.resetAutoClose}
          />
          <PrintAfterSalePreview
            loading={dialog.loading}
            error={dialog.error}
            emailSuccess={dialog.emailSuccess}
            preview={dialog.preview}
            businessInfo={dialog.businessInfo}
            receiptType={dialog.receiptType}
            documentKind={dialog.documentKind}
            lastInvoiceNumber={dialog.lastInvoiceNumber}
            invoiceLegalInfo={dialog.invoiceLegalInfo}
          />
        </Box>
      </DialogContent>
      <PrintAfterSaleActions
        hasValidOrderId={dialog.hasValidOrderId}
        busy={dialog.busy}
        exportingPdf={dialog.exportingPdf}
        emailing={dialog.emailing}
        email={dialog.form.email}
        isInvoiceDocument={dialog.isInvoiceDocument}
        onClose={onClose}
        onExportPdf={() => void dialog.handleExportPdf()}
        onSendEmail={() => void dialog.handleSendEmail()}
        onQueuePrint={() => void dialog.handleQueuePrint()}
      />
    </Dialog>
  );
};

export default PrintAfterSaleDialog;
