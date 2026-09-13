import React from 'react';
import { Box, Button, Collapse, TextField, Typography } from '@mui/material';
import { ParisDateField } from '../common/ParisDateTimeField';
import type { InvoiceFormState } from './printAfterSaleInvoice';

type Props = {
  open: boolean;
  onToggle: () => void;
  form: InvoiceFormState;
  onChange: (patch: Partial<InvoiceFormState>) => void;
  invoiceMode: 'detailed' | 'summary';
  creatingInvoice: boolean;
  onExportJson: () => void;
};

/** Optional B2B / client fields — invoice print works without opening this. */
export function PrintAfterSaleInvoiceExtras({
  open,
  onToggle,
  form,
  onChange,
  invoiceMode,
  creatingInvoice,
  onExportJson,
}: Props) {
  return (
    <Box sx={{ mb: 1 }}>
      <Button size="small" onClick={onToggle} sx={{ mb: 1, textTransform: 'none' }}>
        {open ? 'Masquer infos client / B2B' : 'Infos client / B2B (optionnel)'}
      </Button>
      <Collapse in={open}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Nom client défaut « Client ». Adresse facultative (particulier). Mentions paiement
          préremplies pour une vente déjà encaissée.
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="Nom client"
          value={form.customerName}
          onChange={(e) => onChange({ customerName: e.target.value })}
          sx={{ mb: 1 }}
        />
        <TextField
          fullWidth
          size="small"
          label="Adresse client (optionnel)"
          value={form.customerAddress}
          onChange={(e) => onChange({ customerAddress: e.target.value })}
          sx={{ mb: 1 }}
        />
        <TextField
          fullWidth
          size="small"
          label="N TVA client (optionnel)"
          value={form.customerTaxId}
          onChange={(e) => onChange({ customerTaxId: e.target.value })}
          sx={{ mb: 1 }}
        />
        <ParisDateField
          label="Échéance paiement (jj/mm/aaaa)"
          value={form.paymentDueDate}
          onChange={(ymd) => onChange({ paymentDueDate: ymd })}
          size="small"
        />
        <TextField
          fullWidth
          size="small"
          label="Conditions paiement"
          value={form.paymentTerms}
          onChange={(e) => onChange({ paymentTerms: e.target.value })}
          sx={{ mb: 1 }}
        />
        <TextField
          fullWidth
          size="small"
          label="Pénalités retard"
          value={form.latePenaltyTerms}
          onChange={(e) => onChange({ latePenaltyTerms: e.target.value })}
          sx={{ mb: 1 }}
        />
        <TextField
          fullWidth
          size="small"
          label="Mention indemnité 40 EUR"
          value={form.recoveryFeeNote}
          onChange={(e) => onChange({ recoveryFeeNote: e.target.value })}
          sx={{ mb: 1 }}
        />
        <TextField
          fullWidth
          size="small"
          label="Forme juridique vendeur (optionnel)"
          value={form.sellerLegalForm}
          onChange={(e) => onChange({ sellerLegalForm: e.target.value })}
          sx={{ mb: 1 }}
        />
        <TextField
          fullWidth
          size="small"
          type="number"
          label="Capital social EUR (optionnel)"
          value={form.sellerShareCapitalEur}
          onChange={(e) => onChange({ sellerShareCapitalEur: e.target.value })}
        />
        <Button
          sx={{ mt: 1 }}
          variant="outlined"
          fullWidth
          disabled={creatingInvoice}
          onClick={onExportJson}
        >
          {creatingInvoice
            ? 'Création...'
            : `Exporter JSON ${invoiceMode === 'detailed' ? '(détail)' : '(sans détail)'}`}
        </Button>
      </Collapse>
    </Box>
  );
}
