/**
 * Happy Hour Schedule Component
 * Displays and manages individual product discounts
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Box,
  Chip,
  IconButton,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Discount as DiscountIcon,
} from '@mui/icons-material';
import { HappyHourScheduleProps } from './types';
import { Product } from '../../../types';

/**
 * Happy Hour Schedule Component
 */
export const HappyHourSchedule: React.FC<HappyHourScheduleProps> = ({
  eligibleProducts,
  editingProductId,
  editForm,
  onEditProduct,
  onEditFormChange,
  onSaveProduct,
  onCancelEdit,
  loading = false,
}) => {
  /**
   * Calculate happy hour price for a product
   */
  const calculateHappyHourPrice = (product: Product) => {
    const discountType = product.happyHourDiscountType || 'percentage';
    const discountValue = product.happyHourDiscountValue || 0.2; // Default 20%

    let happyHourPrice: number;
    let value: number;
    let label: string;

    if (discountType === 'percentage') {
      value = discountValue;
      happyHourPrice = product.price * (1 - discountValue);
      label = `-${(discountValue * 100).toFixed(0)}%`;
    } else {
      value = discountValue;
      happyHourPrice = Math.max(0, product.price - discountValue);
      label = `-${discountValue.toFixed(2)}€`;
    }

    return { price: happyHourPrice, value, label };
  };

  /**
   * Handle save product
   */
  const handleSaveProduct = async (productId: string) => {
    try {
      await onSaveProduct(productId);
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  if (eligibleProducts.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DiscountIcon />
            Produits éligibles
          </Typography>
          
          <Alert severity="info">
            <Typography variant="body2">
              Aucun produit n'est actuellement éligible pour l'Happy Hour.
              <br />
              Vérifiez que vos produits sont marqués comme éligibles dans la gestion des produits.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DiscountIcon />
          Produits éligibles ({eligibleProducts.length})
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configurez les réductions spécifiques pour chaque produit ou laissez vide pour utiliser la réduction par défaut.
        </Typography>

        <Grid container spacing={2}>
          {eligibleProducts.map((product) => {
            const { price: happyHourPrice, label } = calculateHappyHourPrice(product);
            const isEditing = editingProductId === product.id;

            return (
              <Grid item xs={12} sm={6} md={4} key={product.id}>
                <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Product Header */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" noWrap title={product.name}>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {product.description}
                      </Typography>
                    </Box>
                    
                    {!isEditing && (
                      <IconButton
                        size="small"
                        onClick={() => onEditProduct(product.id)}
                        disabled={loading}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>

                  {/* Product Content */}
                  {!isEditing ? (
                    <Box sx={{ flex: 1 }}>
                      {/* Pricing Information */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2">
                          Prix normal: {product.price.toFixed(2)}€
                        </Typography>
                        <Chip label={label} color="warning" size="small" />
                      </Box>
                      
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        Prix Happy Hour: {happyHourPrice.toFixed(2)}€
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Économie: {(product.price - happyHourPrice).toFixed(2)}€
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ flex: 1 }}>
                      {/* Edit Form */}
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Type de réduction</InputLabel>
                            <Select
                              value={editForm.type}
                              label="Type de réduction"
                              onChange={(e) =>
                                onEditFormChange({
                                  ...editForm,
                                  type: e.target.value as 'percentage' | 'fixed',
                                  value: '0',
                                })
                              }
                              disabled={loading}
                            >
                              <MenuItem value="percentage">Pourcentage (%)</MenuItem>
                              <MenuItem value="fixed">Montant fixe (€)</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label={
                              editForm.type === 'percentage'
                                ? 'Réduction (%)'
                                : 'Réduction (€)'
                            }
                            type="number"
                            value={editForm.value}
                            onChange={(e) =>
                              onEditFormChange({
                                ...editForm,
                                value: e.target.value,
                              })
                            }
                            disabled={loading}
                            inputProps={{
                              min: 0,
                              max: editForm.type === 'percentage' ? 100 : product.price,
                              step: editForm.type === 'percentage' ? 1 : 0.01,
                            }}
                          />
                        </Grid>
                      </Grid>

                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={() => handleSaveProduct(product.id)}
                          disabled={loading || !editForm.value || parseFloat(editForm.value) <= 0}
                          fullWidth
                        >
                          Sauvegarder
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          onClick={onCancelEdit}
                          disabled={loading}
                        >
                          Annuler
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {/* Information */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Gestion des produits Happy Hour:
          </Typography>
          <Typography variant="body2">
            • Cliquez sur l'icône d'édition pour personnaliser la réduction d'un produit<br />
            • Les produits sans réduction personnalisée utilisent la réduction par défaut<br />
            • Les modifications sont appliquées immédiatement après sauvegarde<br />
            • Les prix Happy Hour sont automatiquement calculés
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default HappyHourSchedule;

