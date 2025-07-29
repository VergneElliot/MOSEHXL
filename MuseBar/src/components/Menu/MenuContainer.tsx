import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Category, Product } from '../../types';
import { useMenuState } from '../../hooks/useMenuState';
import { useMenuAPI } from '../../hooks/useMenuAPI';
import CategorySection from './CategorySection';
import ProductSection from './ProductSection';
import CategoryDialog from './CategoryDialog';
import ProductDialog from './ProductDialog';

interface MenuContainerProps {
  categories: Category[];
  products: Product[];
  onDataUpdate: () => void;
}

const MenuContainer: React.FC<MenuContainerProps> = ({ categories, products, onDataUpdate }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Custom hooks for state management
  const [state, actions] = useMenuState();

  // Custom hook for API calls
  const api = useMenuAPI(
    actions.setArchivedProducts,
    actions.setArchivedCategories,
    actions.showSuccess,
    actions.showError,
    actions.closeCategoryDialog,
    actions.closeProductDialog,
    onDataUpdate
  );

  // Load archived data when showArchived changes
  useEffect(() => {
    if (state.showArchived) {
      api.loadArchivedProducts();
      api.loadArchivedCategories();
    }
  }, [state.showArchived, api]);

  // Event handlers
  const handleCreateCategory = () => {
    actions.openCategoryDialog();
  };

  const handleEditCategory = (category: Category) => {
    actions.openCategoryDialog(category);
  };

  const handleCreateProduct = () => {
    actions.openProductDialog();
  };

  const handleEditProduct = (product: Product) => {
    actions.openProductDialog(product);
  };

  const handleSubmitCategory = async () => {
    if (state.editingCategory) {
      await api.updateCategory(state.editingCategory.id, state.categoryForm);
    } else {
      await api.createCategory(state.categoryForm);
    }
  };

  const handleSubmitProduct = async () => {
    if (state.editingProduct) {
      await api.updateProduct(state.editingProduct.id, state.productForm);
    } else {
      await api.createProduct(state.productForm);
    }
  };

  const handleCloseSnackbar = () => {
    actions.closeSnackbar();
  };

  // Utility functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} component="h1" gutterBottom>
          🍽️ Gestion du Menu
        </Typography>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="textSecondary">
            Gérez vos catégories et produits pour organiser votre menu
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={state.showArchived}
                onChange={e => actions.setShowArchived(e.target.checked)}
              />
            }
            label="Afficher les éléments archivés"
          />
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* Category Section */}
        <CategorySection
          categories={categories}
          archivedCategories={state.archivedCategories}
          showArchived={state.showArchived}
          onCreateCategory={handleCreateCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={api.deleteCategory}
          onArchiveCategory={api.archiveCategory}
          onRestoreCategory={api.restoreCategory}
        />

        {/* Product Section */}
        <Box sx={{ mt: 2 }}>
          <ProductSection
            products={products}
            categories={categories}
            archivedProducts={state.archivedProducts}
            showArchived={state.showArchived}
            onCreateProduct={handleCreateProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={api.deleteProduct}
            onArchiveProduct={api.archiveProduct}
            onRestoreProduct={api.restoreProduct}
            formatCurrency={formatCurrency}
          />
        </Box>
      </Box>

      {/* Success/Error Messages */}
      <Snackbar
        open={state.snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={state.snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {state.snackbar.message}
        </Alert>
      </Snackbar>

      {/* Category Dialog */}
      <CategoryDialog
        open={state.categoryDialogOpen}
        onClose={actions.closeCategoryDialog}
        onSubmit={handleSubmitCategory}
        form={state.categoryForm}
        onFormChange={actions.updateCategoryForm}
        editingCategory={state.editingCategory}
        loading={false}
        error={null}
      />

      {/* Product Dialog */}
      <ProductDialog
        open={state.productDialogOpen}
        onClose={actions.closeProductDialog}
        onSubmit={handleSubmitProduct}
        form={state.productForm}
        onFormChange={actions.updateProductForm}
        editingProduct={state.editingProduct}
        categories={categories}
        loading={false}
        error={null}
      />
    </Box>
  );
};

export default MenuContainer;
