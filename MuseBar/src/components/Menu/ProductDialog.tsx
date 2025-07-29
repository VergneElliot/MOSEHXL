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
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import { Product, Category } from '../../types';
import { ProductFormData } from '../../hooks/useMenuState';

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: ProductFormData;
  onFormChange: (field: keyof ProductFormData, value: any) => void;
  editingProduct: Product | null;
  categories: Category[];
  loading: boolean;
  error: string | null;
}

const ProductDialog: React.FC<ProductDialogProps> = ({
  open,
  onClose,
  onSubmit,
  form,
  onFormChange,
  editingProduct,
  categories,
  loading,
  error,
}) => {
  const isEditing = !!editingProduct;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const activeCategories = categories.filter(cat => cat.isActive);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Typography variant="h6" component="h2">
            {isEditing ? 'Modifier le Produit' : 'Nouveau Produit'}
          </Typography>
          {isEditing && (
            <Typography variant="body2" color="textSecondary">
              Modification du produit "{editingProduct.name}"
            </Typography>
          )}
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Basic Information */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Informations de base
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Nom du produit"
                  value={form.name}
                  onChange={e => onFormChange('name', e.target.value)}
                  required
                  fullWidth
                  autoFocus
                  placeholder="Ex: Heineken, Mojito, Chips..."
                  helperText="Nom du produit tel qu'il apparaîtra sur la caisse"
                />

                <TextField
                  label="Description (optionnel)"
                  value={form.description}
                  onChange={e => onFormChange('description', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Description détaillée du produit..."
                  helperText="Description pour les serveurs et la gestion"
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Prix (€)"
                    type="number"
                    value={form.price}
                    onChange={e => onFormChange('price', e.target.value)}
                    required
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                    placeholder="0.00"
                    helperText="Prix en euros"
                  />

                  <FormControl fullWidth>
                    <InputLabel>Taux de TVA</InputLabel>
                    <Select
                      value={form.taxRate}
                      onChange={e => onFormChange('taxRate', e.target.value)}
                      label="Taux de TVA"
                    >
                      <MenuItem value={0.1}>10% (Réduit)</MenuItem>
                      <MenuItem value={0.2}>20% (Normal)</MenuItem>
                      <MenuItem value={0.05}>5.5% (Très réduit)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <FormControl fullWidth>
                  <InputLabel>Catégorie</InputLabel>
                  <Select
                    value={form.categoryId}
                    onChange={e => onFormChange('categoryId', e.target.value)}
                    label="Catégorie"
                    required
                  >
                    {activeCategories.map(category => (
                      <MenuItem key={category.id} value={category.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              backgroundColor: category.color || '#1976d2',
                              borderRadius: 0.5,
                            }}
                          />
                          {category.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider />

            {/* Happy Hour Settings */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Configuration Happy Hour
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.isHappyHourEligible}
                      onChange={e => onFormChange('isHappyHourEligible', e.target.checked)}
                    />
                  }
                  label="Éligible aux réductions Happy Hour"
                />

                {form.isHappyHourEligible && (
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel>Type de réduction</InputLabel>
                      <Select
                        value={form.happyHourDiscountType}
                        onChange={e => onFormChange('happyHourDiscountType', e.target.value)}
                        label="Type de réduction"
                      >
                        <MenuItem value="percentage">Pourcentage (%)</MenuItem>
                        <MenuItem value="fixed">Montant fixe (€)</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      label={
                        form.happyHourDiscountType === 'percentage'
                          ? 'Réduction (%)'
                          : 'Réduction (€)'
                      }
                      type="number"
                      value={form.happyHourDiscountValue}
                      onChange={e => onFormChange('happyHourDiscountValue', e.target.value)}
                      fullWidth
                      inputProps={{
                        min: 0,
                        max: form.happyHourDiscountType === 'percentage' ? 100 : undefined,
                        step: form.happyHourDiscountType === 'percentage' ? 1 : 0.01,
                      }}
                      placeholder={form.happyHourDiscountType === 'percentage' ? '20' : '2.00'}
                      helperText={
                        form.happyHourDiscountType === 'percentage'
                          ? 'Pourcentage de réduction (ex: 20 = 20% de réduction)'
                          : 'Montant fixe de réduction en euros'
                      }
                    />
                  </Box>
                )}
              </Box>
            </Box>

            {/* Price Preview */}
            {form.price && (
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Aperçu du prix:
                </Typography>
                <Typography variant="body2">
                  Prix HT: {parseFloat(form.price) / (1 + form.taxRate)}€
                  <br />
                  TVA ({Math.round(form.taxRate * 100)}%):{' '}
                  {(parseFloat(form.price) * form.taxRate) / (1 + form.taxRate)}€
                  <br />
                  <strong>Prix TTC: {form.price}€</strong>
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !form.name.trim() || !form.price || !form.categoryId}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProductDialog;
