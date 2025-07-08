import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Category as CategoryIcon,
  LocalBar as ProductIcon
} from '@mui/icons-material';
import { DataService } from '../services/dataService';
import { Category, Product } from '../types';

interface MenuManagementProps {
  categories: Category[];
  products: Product[];
  onDataUpdate: () => void;
}

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  taxRate: number;
  categoryId: string;
  isHappyHourEligible: boolean;
  happyHourDiscountType: 'percentage' | 'fixed';
  happyHourDiscountValue: string;
}

const MenuManagement: React.FC<MenuManagementProps> = ({ categories, products, onDataUpdate }) => {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [showArchived, setShowArchived] = useState(false);
  const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);
  const [archivedCategories, setArchivedCategories] = useState<Category[]>([]);

  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    description: '',
    color: '#1976d2'
  });

  const [productForm, setProductForm] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    taxRate: 0.20,
    categoryId: '',
    isHappyHourEligible: false,
    happyHourDiscountType: 'percentage',
    happyHourDiscountValue: '0'
  });

  const dataService = DataService.getInstance();

  const loadArchivedProducts = async () => {
    try {
      const archived = await dataService.getArchivedProducts();
      setArchivedProducts(archived);
    } catch (error) {
      console.error('Error loading archived products:', error);
    }
  };

  const loadArchivedCategories = async () => {
    try {
      const archived = await dataService.getArchivedCategories();
      setArchivedCategories(archived);
    } catch (error) {
      console.error('Error loading archived categories:', error);
    }
  };

  // Load archived data when showArchived changes
  React.useEffect(() => {
    if (showArchived) {
      loadArchivedProducts();
      loadArchivedCategories();
    }
  }, [showArchived]);

  const handleCategorySubmit = async () => {
    try {
      if (editingCategory) {
        await dataService.updateCategory(editingCategory.id, categoryForm);
        setSnackbar({ open: true, message: 'Catégorie mise à jour avec succès', severity: 'success' });
      } else {
        await dataService.createCategory(categoryForm);
        setSnackbar({ open: true, message: 'Catégorie créée avec succès', severity: 'success' });
      }
      handleCategoryDialogClose();
      await onDataUpdate();
    } catch (error) {
      setSnackbar({ open: true, message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, severity: 'error' });
    }
  };

  const handleProductSubmit = async () => {
    try {
      const productData = {
        ...productForm,
        price: parseFloat(productForm.price),
        happyHourDiscountValue: parseFloat(productForm.happyHourDiscountValue),
        isActive: true
      };

      if (editingProduct) {
        await dataService.updateProduct(editingProduct.id, productData);
        setSnackbar({ open: true, message: 'Produit mis à jour avec succès', severity: 'success' });
      } else {
        await dataService.createProduct(productData);
        setSnackbar({ open: true, message: 'Produit créé avec succès', severity: 'success' });
      }
      handleProductDialogClose();
      await onDataUpdate();
    } catch (error) {
      setSnackbar({ open: true, message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, severity: 'error' });
    }
  };

  const handleCategoryDialogClose = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', color: '#1976d2' });
  };

  const handleProductDialogClose = () => {
    setProductDialogOpen(false);
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      price: '',
      taxRate: 0.20,
      categoryId: '',
      isHappyHourEligible: false,
      happyHourDiscountType: 'percentage',
      happyHourDiscountValue: '0'
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color || '#1976d2'
    });
    setCategoryDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      taxRate: product.taxRate,
      categoryId: product.categoryId,
      isHappyHourEligible: product.isHappyHourEligible,
      happyHourDiscountType: product.happyHourDiscountType,
      happyHourDiscountValue: product.happyHourDiscountValue.toString()
    });
    setProductDialogOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const result = await dataService.deleteCategory(categoryId);
      setSnackbar({ 
        open: true, 
        message: result.message || 'Catégorie traitée avec succès', 
        severity: 'success' 
      });
      await onDataUpdate();
      if (showArchived) {
        await loadArchivedCategories();
      }
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 
        severity: 'error' 
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const response = await dataService.deleteProduct(productId);
      setSnackbar({ open: true, message: 'Produit traité avec succès', severity: 'success' });
      await onDataUpdate();
      if (showArchived) {
        await loadArchivedProducts();
      }
    } catch (error) {
      setSnackbar({ open: true, message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, severity: 'error' });
    }
  };

  const handleRestoreProduct = async (productId: string) => {
    try {
      await dataService.restoreProduct(productId);
      setSnackbar({ open: true, message: 'Produit restauré avec succès', severity: 'success' });
      await onDataUpdate();
      await loadArchivedProducts();
    } catch (error) {
      setSnackbar({ open: true, message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, severity: 'error' });
    }
  };

  const handleRestoreCategory = async (categoryId: string) => {
    try {
      await dataService.restoreCategory(categoryId);
      setSnackbar({ open: true, message: 'Catégorie restaurée avec succès', severity: 'success' });
      await onDataUpdate();
      await loadArchivedCategories();
    } catch (error) {
      setSnackbar({ open: true, message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, severity: 'error' });
    }
  };

  const getProductsByCategory = (categoryId: string) => {
    return products.filter(product => product.categoryId === categoryId);
  };

  const getArchivedProductsByCategory = (categoryId: string) => {
    return archivedProducts.filter(product => product.categoryId === categoryId);
  };

  // Get orphaned archived products (products whose categories no longer exist in archived categories)
  const getOrphanedArchivedProducts = () => {
    const archivedCategoryIds = new Set(archivedCategories.map(cat => cat.id));
    return archivedProducts.filter(product => !archivedCategoryIds.has(product.categoryId));
  };

  // Get all categories that have archived products (including active categories with archived products)
  const getCategoriesWithArchivedProducts = () => {
    const categoriesWithArchivedProducts = new Set(archivedProducts.map(product => product.categoryId));
    
    // Get all categories (active + archived) that have archived products
    const allCategories = [...categories, ...archivedCategories];
    const uniqueCategories = allCategories.filter((category, index, self) => 
      self.findIndex(c => c.id === category.id) === index
    );
    
    return uniqueCategories.filter(category => categoriesWithArchivedProducts.has(category.id));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Gestion du Menu
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={showArchived ? "outlined" : "contained"}
            onClick={() => setShowArchived(false)}
          >
            Produits Actifs
          </Button>
          <Button
            variant={showArchived ? "contained" : "outlined"}
            onClick={() => setShowArchived(true)}
          >
            Produits Archivés
          </Button>
          <Button
            variant="contained"
            startIcon={<CategoryIcon />}
            onClick={() => setCategoryDialogOpen(true)}
          >
            Nouvelle Catégorie
          </Button>
          <Button
            variant="contained"
            startIcon={<ProductIcon />}
            onClick={() => setProductDialogOpen(true)}
            disabled={showArchived}
          >
            Nouveau Produit
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {(showArchived ? getCategoriesWithArchivedProducts() : categories).map((category) => (
          <Grid item xs={12} md={6} key={category.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: category.color || '#1976d2',
                        border: '2px solid #ddd'
                      }}
                    />
                    <Typography variant="h6">{category.name}</Typography>
                    {!category.isActive && (
                      <Chip label="Archivée" size="small" color="warning" />
                    )}
                  </Box>
                  {showArchived ? (
                    !category.isActive && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleRestoreCategory(category.id)}
                      >
                        Restaurer
                      </Button>
                    )
                  ) : (
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleEditCategory(category)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>

                {category.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {category.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2">
                    {showArchived ? getArchivedProductsByCategory(category.id).length : getProductsByCategory(category.id).length} produit(s) {showArchived ? 'archivé(s)' : 'actif(s)'}
                  </Typography>
                  {!showArchived && (
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setProductForm(prev => ({ ...prev, categoryId: category.id }));
                        setProductDialogOpen(true);
                      }}
                    >
                      Ajouter un produit
                    </Button>
                  )}
                </Box>

                {(showArchived ? getArchivedProductsByCategory(category.id) : getProductsByCategory(category.id)).map((product) => (
                  <Accordion key={product.id} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Typography>{product.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {product.price.toFixed(2)}€
                          </Typography>
                          {!product.isActive && (
                            <Chip label="Inactif" size="small" color="error" />
                          )}
                          {product.isHappyHourEligible && (
                            <Chip label="Happy Hour" size="small" color="warning" />
                          )}
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          {product.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {product.description}
                            </Typography>
                          )}
                          <Typography variant="body2">
                            Taxe: {(product.taxRate * 100).toFixed(0)}% | 
                            Happy Hour: {product.isHappyHourEligible ? `${(product.happyHourDiscountValue)}` : 'Non éligible'}
                          </Typography>
                        </Box>
                        <Box>
                          {!showArchived ? (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => handleEditProduct(product)}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleRestoreProduct(product.id)}
                            >
                              Restaurer
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        {/* Show orphaned archived products if in archived view */}
        {showArchived && getOrphanedArchivedProducts().length > 0 && (
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '2px dashed #ff9800' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: '#ff9800',
                        border: '2px solid #ddd'
                      }}
                    />
                    <Typography variant="h6">Produits Orphelins</Typography>
                    <Chip label="Catégorie supprimée" size="small" color="error" />
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Produits dont la catégorie a été supprimée
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2">
                    {getOrphanedArchivedProducts().length} produit(s) archivé(s)
                  </Typography>
                </Box>

                {getOrphanedArchivedProducts().map((product) => (
                  <Accordion key={product.id} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Typography>{product.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {product.price.toFixed(2)}€
                          </Typography>
                          <Chip label="Orphelin" size="small" color="error" />
                          {product.isHappyHourEligible && (
                            <Chip label="Happy Hour" size="small" color="warning" />
                          )}
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          {product.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {product.description}
                            </Typography>
                          )}
                          <Typography variant="body2">
                            Taxe: {(product.taxRate * 100).toFixed(0)}% | 
                            Happy Hour: {product.isHappyHourEligible ? `${(product.happyHourDiscountValue)}` : 'Non éligible'}
                          </Typography>
                          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                            ⚠️ Catégorie supprimée - Nécessite une nouvelle catégorie pour la restauration
                          </Typography>
                        </Box>
                        <Box>
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={() => handleRestoreProduct(product.id)}
                          >
                            Restaurer
                          </Button>
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Dialog Catégorie */}
      <Dialog open={categoryDialogOpen} onClose={handleCategoryDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom de la catégorie"
            fullWidth
            value={categoryForm.name}
            onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optionnel)"
            fullWidth
            multiline
            rows={3}
            value={categoryForm.description}
            onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Couleur"
            type="color"
            fullWidth
            value={categoryForm.color}
            onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCategoryDialogClose}>Annuler</Button>
          <Button onClick={handleCategorySubmit} variant="contained">
            {editingCategory ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Produit */}
      <Dialog open={productDialogOpen} onClose={handleProductDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                label="Nom du produit"
                fullWidth
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={productForm.categoryId}
                  label="Catégorie"
                  onChange={(e) => setProductForm(prev => ({ ...prev, categoryId: e.target.value }))}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description (optionnel)"
                fullWidth
                multiline
                rows={2}
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Prix TTC (€)"
                type="number"
                fullWidth
                value={productForm.price}
                onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                inputProps={{ step: 0.01, min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Taux de taxe</InputLabel>
                <Select
                  value={productForm.taxRate}
                  label="Taux de taxe"
                  onChange={(e) => setProductForm(prev => ({ ...prev, taxRate: e.target.value as number }))}
                >
                  <MenuItem value={0.20}>20% (Alcool)</MenuItem>
                  <MenuItem value={0.10}>10% (Sans alcool)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={productForm.isHappyHourEligible}
                    onChange={(e) => setProductForm(prev => ({ ...prev, isHappyHourEligible: e.target.checked }))}
                  />
                }
                label="Éligible à l'Happy Hour"
              />
            </Grid>
            {productForm.isHappyHourEligible && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type de réduction</InputLabel>
                  <Select
                    value={productForm.happyHourDiscountType}
                    label="Type de réduction"
                    onChange={(e) => setProductForm(prev => ({ ...prev, happyHourDiscountType: e.target.value as 'percentage' | 'fixed', happyHourDiscountValue: '0' }))}
                  >
                    <MenuItem value="percentage">Pourcentage (%)</MenuItem>
                    <MenuItem value="fixed">Montant fixe (€)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            {productForm.isHappyHourEligible && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label={productForm.happyHourDiscountType === 'percentage' ? 'Réduction (%)' : 'Réduction (€)'}
                  type="number"
                  fullWidth
                  value={productForm.happyHourDiscountValue}
                  onChange={(e) => setProductForm(prev => ({ ...prev, happyHourDiscountValue: e.target.value }))}
                  inputProps={productForm.happyHourDiscountType === 'percentage' ? { min: 0, max: 100 } : { min: 0, step: 0.01 }}
                  helperText={productForm.happyHourDiscountValue === '' || productForm.happyHourDiscountValue === '0' ? 'Utilisera la réduction par défaut de l\'Happy Hour' : ''}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleProductDialogClose}>Annuler</Button>
          <Button onClick={handleProductSubmit} variant="contained">
            {editingProduct ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MenuManagement; 