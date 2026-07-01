import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  MenuItem,
} from '@mui/material';
import { KitchenPrinter } from '../../types';
import { KitchenPrinterFormData } from '../../hooks/useKitchenPrinters';

interface KitchenPrinterDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: KitchenPrinterFormData;
  onFormChange: (form: KitchenPrinterFormData) => void;
  editingPrinter: KitchenPrinter | null;
  loading: boolean;
  error: string | null;
}

const KitchenPrinterDialog: React.FC<KitchenPrinterDialogProps> = ({
  open,
  onClose,
  onSubmit,
  form,
  onFormChange,
  editingPrinter,
  loading,
  error,
}) => {
  const updateField = <K extends keyof KitchenPrinterFormData>(field: K, value: KitchenPrinterFormData[K]) => {
    onFormChange({ ...form, [field]: value });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <DialogTitle>
          {editingPrinter
            ? `Modifier l'imprimante "${editingPrinter.name}"`
            : 'Nouvelle imprimante de commande'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nom"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
              fullWidth
              placeholder="Bar, Cuisine..."
            />
            <TextField
              label="Slug (routage bridge)"
              value={form.slug}
              onChange={(event) => updateField('slug', event.target.value.toLowerCase())}
              fullWidth
              placeholder="bar, cuisine..."
              helperText="Identifiant stable en minuscules (lettres, chiffres, _). Laisser vide pour générer depuis le nom."
            />
            <TextField
              select
              label="Type de connexion"
              value={form.connectionType}
              onChange={(event) =>
                updateField('connectionType', event.target.value as KitchenPrinterFormData['connectionType'])
              }
              fullWidth
            >
              <MenuItem value="bridge">Bridge local (recommandé)</MenuItem>
              <MenuItem value="network_escpos">Réseau ESC/POS direct</MenuItem>
            </TextField>

            {form.connectionType === 'network_escpos' ? (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Adresse IP / hôte"
                  value={form.host}
                  onChange={(event) => updateField('host', event.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Port"
                  value={form.port}
                  onChange={(event) => updateField('port', event.target.value)}
                  fullWidth
                  sx={{ maxWidth: 120 }}
                />
              </Box>
            ) : (
              <TextField
                label="Cible bridge"
                value={form.bridgeTarget}
                onChange={(event) => updateField('bridgeTarget', event.target.value)}
                fullWidth
                helperText="Doit correspondre au slug routé côté bridge (Phase 4). Par défaut = slug de l'imprimante."
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {editingPrinter ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default KitchenPrinterDialog;
