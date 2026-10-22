import React from 'react';
import { Button, DialogActions } from '@mui/material';

interface PrintAfterSaleActionsProps {
  hasValidOrderId: boolean;
  busy: boolean;
  exportingPdf: boolean;
  emailing: boolean;
  email: string;
  isInvoiceDocument: boolean;
  onClose: () => void;
  onExportPdf: () => void;
  onSendEmail: () => void;
  onQueuePrint: () => void;
}

const PrintAfterSaleActions: React.FC<PrintAfterSaleActionsProps> = ({
  hasValidOrderId,
  busy,
  exportingPdf,
  emailing,
  email,
  isInvoiceDocument,
  onClose,
  onExportPdf,
  onSendEmail,
  onQueuePrint,
}) => (
  <DialogActions>
    <Button onClick={onClose}>Fermer</Button>
    <Button onClick={onExportPdf} variant="outlined" disabled={!hasValidOrderId || busy}>
      {exportingPdf ? 'Export PDF...' : 'Exporter PDF'}
    </Button>
    <Button
      onClick={onSendEmail}
      variant="outlined"
      disabled={!hasValidOrderId || !email.trim() || busy}
    >
      {emailing ? 'Envoi...' : 'Envoyer par email'}
    </Button>
    <Button onClick={onQueuePrint} variant="contained" disabled={!hasValidOrderId || busy}>
      {isInvoiceDocument ? 'Créer et imprimer facture' : 'Imprimer ticket'}
    </Button>
  </DialogActions>
);

export default PrintAfterSaleActions;
