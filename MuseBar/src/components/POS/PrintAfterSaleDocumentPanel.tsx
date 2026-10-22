import React from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import type { InvoiceFormState } from './printAfterSaleInvoice';
import { PrintAfterSaleInvoiceExtras } from './PrintAfterSaleInvoiceExtras';
import {
  PrintAfterSaleSplitPicker,
  type SplitPartOption,
} from './PrintAfterSaleSplitPicker';
import type { DocumentSelection } from './usePrintAfterSaleDialog';

const DOCUMENT_CHOICES = [
  ['ticket', 'Ticket détaillé'],
  ['invoice_detailed', 'Facture avec détail'],
  ['invoice_summary', 'Facture sans détail'],
] as const;

interface PrintAfterSaleDocumentPanelProps {
  selectedDocument: DocumentSelection;
  isInvoiceDocument: boolean;
  invoiceMode: 'detailed' | 'summary';
  splitParts: SplitPartOption[];
  selectedSubBillId: number | null;
  form: InvoiceFormState;
  extrasOpen: boolean;
  creatingInvoice: boolean;
  onSelectDocument: (value: DocumentSelection) => void;
  onSelectSubBill: (id: number | null) => void;
  onPatchForm: (patch: Partial<InvoiceFormState>) => void;
  onToggleExtras: () => void;
  onExportJson: () => void;
  onInteract: () => void;
}

const PrintAfterSaleDocumentPanel: React.FC<PrintAfterSaleDocumentPanelProps> = ({
  selectedDocument,
  isInvoiceDocument,
  invoiceMode,
  splitParts,
  selectedSubBillId,
  form,
  extrasOpen,
  creatingInvoice,
  onSelectDocument,
  onSelectSubBill,
  onPatchForm,
  onToggleExtras,
  onExportJson,
  onInteract,
}) => (
  <Box sx={{ flex: 1, minWidth: 280 }}>
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      Choisir un document
    </Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
      {DOCUMENT_CHOICES.map(([value, label]) => (
        <Button
          key={value}
          size="small"
          variant={selectedDocument === value ? 'contained' : 'outlined'}
          onClick={() => {
            onInteract();
            onSelectDocument(value);
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
        onInteract();
        onSelectSubBill(id);
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
        onInteract();
        onPatchForm({ email: e.target.value });
      }}
      placeholder="client@exemple.com"
      sx={{ mb: 2 }}
    />

    {isInvoiceDocument && (
      <PrintAfterSaleInvoiceExtras
        open={extrasOpen}
        onToggle={() => {
          onInteract();
          onToggleExtras();
        }}
        form={form}
        onChange={(patch) => {
          onInteract();
          onPatchForm(patch);
        }}
        invoiceMode={invoiceMode}
        creatingInvoice={creatingInvoice}
        onExportJson={onExportJson}
      />
    )}
  </Box>
);

export default PrintAfterSaleDocumentPanel;
