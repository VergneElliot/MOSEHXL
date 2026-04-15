import React, { useEffect, useMemo, useState } from 'react';
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
import { apiConfig } from '../../config/api';
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

  const receiptType = useMemo<'detailed' | 'summary'>(() => {
    if (docType === 'invoice_summary') return 'summary';
    return 'detailed';
  }, [docType]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => onClose(), autoCloseMs);
    return () => window.clearTimeout(t);
  }, [open, autoCloseMs, onClose]);

  useEffect(() => {
    if (!open || !orderId) return;
    setError(null);
    setLoading(true);
    setPreview(null);

    (async () => {
      try {
        // Fetch business info for header preview
        const bizRes = await fetch(apiConfig.getEndpoint('/api/legal/business-info'), {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (bizRes.ok) {
          const biz = await bizRes.json();
          setBusinessInfo({
            name: String(biz?.name ?? ''),
            address: String(biz?.address ?? ''),
            phone: String(biz?.phone ?? ''),
            email: String(biz?.email ?? ''),
            siret: biz?.siret ? String(biz.siret) : undefined,
            taxIdentification: biz?.taxIdentification ? String(biz.taxIdentification) : undefined,
          });
        }

        // Preview-only: does not queue a print job.
        const res = await fetch(
          apiConfig.getEndpoint(`/api/printing/receipt/${orderId}/preview?type=${receiptType}`),
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || data?.error || 'Failed to generate print preview');
        }
        setPreview(data.receipt_data);
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
      const res = await fetch(
        apiConfig.getEndpoint(`/api/printing/receipt/${orderId}?type=${receiptType}`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Failed to queue print');
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to queue print');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
              onChange={(_, v) => v && setDocType(v)}
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
              onChange={(e) => setEmail(e.target.value)}
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

