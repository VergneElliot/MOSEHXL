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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Category } from '../../types';
import { CategoryFormData } from '../../hooks/useMenuState';

interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: CategoryFormData;
  onFormChange: (field: keyof CategoryFormData, value: string) => void;
  editingCategory: Category | null;
  loading: boolean;
  error: string | null;
}

const CategoryDialog: React.FC<CategoryDialogProps> = ({
  open,
  onClose,
  onSubmit,
  form,
  onFormChange,
  editingCategory,
  loading,
  error,
}) => {
  const isEditing = !!editingCategory;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Typography variant="h6" component="h2">
            {isEditing ? 'Modifier la Catégorie' : 'Nouvelle Catégorie'}
          </Typography>
          {isEditing && (
            <Typography variant="body2" color="textSecondary">
              Modification de la catégorie "{editingCategory.name}"
            </Typography>
          )}
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nom de la catégorie"
              value={form.name}
              onChange={e => onFormChange('name', e.target.value)}
              required
              fullWidth
              autoFocus
              placeholder="Ex: Bières, Cocktails, Snacks..."
              helperText="Nom unique de la catégorie"
            />

            <TextField
              label="Description (optionnel)"
              value={form.description}
              onChange={e => onFormChange('description', e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Description détaillée de la catégorie..."
              helperText="Description pour organiser vos produits"
            />

            <FormControl fullWidth>
              <InputLabel>Couleur de la catégorie</InputLabel>
              <Select
                value={form.color}
                onChange={e => onFormChange('color', e.target.value)}
                label="Couleur de la catégorie"
              >
                <MenuItem value="#1976d2">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{ width: 20, height: 20, backgroundColor: '#1976d2', borderRadius: 1 }}
                    />
                    Bleu (Défaut)
                  </Box>
                </MenuItem>
                <MenuItem value="#2e7d32">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{ width: 20, height: 20, backgroundColor: '#2e7d32', borderRadius: 1 }}
                    />
                    Vert
                  </Box>
                </MenuItem>
                <MenuItem value="#ed6c02">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{ width: 20, height: 20, backgroundColor: '#ed6c02', borderRadius: 1 }}
                    />
                    Orange
                  </Box>
                </MenuItem>
                <MenuItem value="#d32f2f">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{ width: 20, height: 20, backgroundColor: '#d32f2f', borderRadius: 1 }}
                    />
                    Rouge
                  </Box>
                </MenuItem>
                <MenuItem value="#7b1fa2">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{ width: 20, height: 20, backgroundColor: '#7b1fa2', borderRadius: 1 }}
                    />
                    Violet
                  </Box>
                </MenuItem>
                <MenuItem value="#0288d1">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{ width: 20, height: 20, backgroundColor: '#0288d1', borderRadius: 1 }}
                    />
                    Bleu clair
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" color="textSecondary">
                Aperçu:
              </Typography>
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  backgroundColor: form.color,
                  color: 'white',
                  borderRadius: 1,
                  fontWeight: 'bold',
                }}
              >
                {form.name || 'Nom de la catégorie'}
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !form.name.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CategoryDialog;
