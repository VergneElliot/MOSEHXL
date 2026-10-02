/**
 * Kitchen / bar ticket printers CRUD — lives under Paramètres → Imprimante.
 */

import React, { useCallback, useState } from 'react';
import { Alert, Box, Snackbar } from '@mui/material';
import type { KitchenPrinter } from '../../types';
import KitchenPrintersSection from '../Menu/KitchenPrintersSection';
import KitchenPrinterDialog from '../Menu/KitchenPrinterDialog';
import {
  initialKitchenPrinterForm,
  kitchenPrinterToForm,
  useKitchenPrinters,
  type KitchenPrinterFormData,
} from '../../hooks/useKitchenPrinters';

const KitchenPrintersPanel: React.FC = () => {
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const showSuccess = useCallback((message: string) => {
    setSnackbar({ open: true, message, severity: 'success' });
  }, []);
  const showError = useCallback((message: string) => {
    setSnackbar({ open: true, message, severity: 'error' });
  }, []);

  const kitchenPrintersApi = useKitchenPrinters(showSuccess, showError);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KitchenPrinter | null>(null);
  const [form, setForm] = useState<KitchenPrinterFormData>(initialKitchenPrinterForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openDialog = (printer?: KitchenPrinter) => {
    setError(null);
    if (printer) {
      setEditing(printer);
      setForm(kitchenPrinterToForm(printer));
    } else {
      setEditing(null);
      setForm(initialKitchenPrinterForm);
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(initialKitchenPrinterForm);
    setError(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await kitchenPrintersApi.updatePrinter(editing.id, form);
      } else {
        await kitchenPrintersApi.createPrinter(form);
      }
      closeDialog();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur enregistrement imprimante';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <KitchenPrintersSection
        printers={kitchenPrintersApi.printers}
        onCreatePrinter={() => openDialog()}
        onEditPrinter={openDialog}
        onDeletePrinter={(id) => void kitchenPrintersApi.deletePrinter(id)}
        onTestPrinter={(id) => void kitchenPrintersApi.testPrinter(id)}
      />
      <KitchenPrinterDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSubmit={() => void handleSubmit()}
        form={form}
        onFormChange={setForm}
        editingPrinter={editing}
        loading={saving}
        error={error}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default KitchenPrintersPanel;
