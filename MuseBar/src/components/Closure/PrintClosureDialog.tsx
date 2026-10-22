import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { apiCore } from '../../services/api';
import ClosurePreviewSummary from './ClosurePreviewSummary';
import type { ClosurePreviewData } from './closurePreviewTotals';
import { usePrintClosureActions } from './usePrintClosureActions';

interface PrintClosureDialogProps {
  open: boolean;
  bulletinId: number | null;
  onClose: () => void;
  onPrintSuccess: (message: string) => void;
  onPrintError: (message: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}

const PrintClosureDialog: React.FC<PrintClosureDialogProps> = ({
  open,
  bulletinId,
  onClose,
  onPrintSuccess,
  onPrintError,
  formatCurrency,
  formatDate,
}) => {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClosurePreviewData | null>(null);

  const hasValidId = useMemo(() => Number.isFinite(bulletinId) && (bulletinId ?? 0) > 0, [bulletinId]);
  useEffect(() => {
    if (!open) return;
    if (!hasValidId || bulletinId == null) {
      setPreview(null);
      setError('Identifiant de bulletin invalide.');
      return;
    }

    setLoadingPreview(true);
    setError(null);
    setSuccess(null);
    setPreview(null);
    setEmail('');

    (async () => {
      try {
        const [previewRes, settingsRes] = await Promise.all([
          apiCore.request<{ bulletin_data: ClosurePreviewData }>(
            `/printing/closure/${bulletinId}/preview`,
            { method: 'GET' }
          ),
          apiCore
            .request<{ settings?: { accounting_emails?: string[] } }>('/legal/closure-settings', {
              method: 'GET',
            })
            .catch(() => null),
        ]);
        setPreview(previewRes.bulletin_data);
        const defaults = settingsRes?.settings?.accounting_emails;
        if (Array.isArray(defaults) && defaults.length > 0) {
          setEmail(defaults.join(', '));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Impossible de charger l’aperçu du bulletin');
      } finally {
        setLoadingPreview(false);
      }
    })();
  }, [open, hasValidId, bulletinId]);

  const [busy, actions] = usePrintClosureActions({
    bulletinId,
    hasValidId,
    preview,
    email,
    setError,
    setSuccess,
    onClose,
    onPrintSuccess,
    onPrintError,
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Impression / envoi du bulletin de clôture</DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          size="small"
          label="Emails destinataires"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="comptable@exemple.com, associe@exemple.com"
          multiline
          minRows={2}
          helperText="Envoi ponctuel de ce bulletin. Prérempli avec les emails comptables des paramètres — ajoutez ou retirez des adresses ici sans modifier les paramètres. Séparez par des virgules."
          sx={{ mb: 2 }}
        />
        {loadingPreview && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {!loadingPreview && preview && (
          <ClosurePreviewSummary preview={preview} formatCurrency={formatCurrency} formatDate={formatDate} />
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose}>Fermer</Button>
        <Button onClick={actions.handleExportJson} variant="outlined" disabled={loadingPreview || busy.exporting || !preview}>
          {busy.exporting ? 'Export...' : 'JSON'}
        </Button>
        <Button onClick={actions.handleExportPdf} variant="outlined" disabled={loadingPreview || busy.exportingPdf || !preview}>
          {busy.exportingPdf ? 'PDF...' : 'PDF comptable'}
        </Button>
        <Button onClick={actions.handleExportXlsx} variant="outlined" disabled={loadingPreview || busy.exportingXlsx || !preview}>
          {busy.exportingXlsx ? 'Excel...' : 'Excel comptable'}
        </Button>
        <Button
          onClick={actions.handleExportFlux103}
          variant="outlined"
          disabled={loadingPreview || busy.exportingFlux103 || !preview}
        >
          {busy.exportingFlux103 ? 'XML...' : 'Flux 10.3 XML'}
        </Button>
        <Button
          onClick={actions.handleSendEmail}
          variant="outlined"
          disabled={loadingPreview || busy.emailing || !preview || !email.trim()}
        >
          {busy.emailing ? 'Envoi...' : 'Envoyer par email'}
        </Button>
        <Button onClick={actions.handlePrint} variant="contained" disabled={loadingPreview || busy.printing || !preview}>
          {busy.printing ? 'Impression...' : 'Imprimer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintClosureDialog;
