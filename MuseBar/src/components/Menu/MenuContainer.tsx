import React, { useEffect, useState } from 'react';
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
import { Category, Product, ProductOptionGroup, KitchenPrinter } from '../../types';
import { useMenuState } from '../../hooks/useMenuState';
import { useMenuAPI } from '../../hooks/useMenuAPI';
import {
  initialOptionGroupForm,
  optionGroupToForm,
  useProductOptionGroups,
  type OptionGroupFormData,
} from '../../hooks/useProductOptionGroups';
import CategorySection from './CategorySection';
import ProductSection from './ProductSection';
import CategoryDialog from './CategoryDialog';
import ProductDialog from './ProductDialog';
import OptionGroupsSection from './OptionGroupsSection';
import OptionGroupDialog from './OptionGroupDialog';
import KitchenPrintersSection from './KitchenPrintersSection';
import KitchenPrinterDialog from './KitchenPrinterDialog';
import {
  initialKitchenPrinterForm,
  kitchenPrinterToForm,
  useKitchenPrinters,
  type KitchenPrinterFormData,
} from '../../hooks/useKitchenPrinters';
import { formatCurrency } from '../../utils/formatCurrency';

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

  const optionGroupsApi = useProductOptionGroups(actions.showSuccess, actions.showError);
  const kitchenPrintersApi = useKitchenPrinters(actions.showSuccess, actions.showError);
  const [optionGroupDialogOpen, setOptionGroupDialogOpen] = useState(false);
  const [editingOptionGroup, setEditingOptionGroup] = useState<ProductOptionGroup | null>(null);
  const [optionGroupForm, setOptionGroupForm] = useState<OptionGroupFormData>(initialOptionGroupForm);
  const [optionGroupError, setOptionGroupError] = useState<string | null>(null);
  const [optionGroupSaving, setOptionGroupSaving] = useState(false);
  const [kitchenPrinterDialogOpen, setKitchenPrinterDialogOpen] = useState(false);
  const [editingKitchenPrinter, setEditingKitchenPrinter] = useState<KitchenPrinter | null>(null);
  const [kitchenPrinterForm, setKitchenPrinterForm] = useState<KitchenPrinterFormData>(initialKitchenPrinterForm);
  const [kitchenPrinterError, setKitchenPrinterError] = useState<string | null>(null);
  const [kitchenPrinterSaving, setKitchenPrinterSaving] = useState(false);

  // Load archived data only when showArchived turns true (avoid re-running when api reference changes → 429 cascade)
  const showArchivedRef = React.useRef(state.showArchived);
  const loadArchivedRef = React.useRef(api);
  loadArchivedRef.current = api;
  useEffect(() => {
    if (state.showArchived && !showArchivedRef.current) {
      showArchivedRef.current = true;
      loadArchivedRef.current.loadArchivedProducts();
      loadArchivedRef.current.loadArchivedCategories();
    }
    if (!state.showArchived) showArchivedRef.current = false;
    // Intentionally omit api from deps to prevent request cascade (parent re-render → new api → effect re-run → 429)
  }, [state.showArchived]);

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

  const openOptionGroupDialog = (group?: ProductOptionGroup) => {
    setOptionGroupError(null);
    if (group) {
      setEditingOptionGroup(group);
      setOptionGroupForm(optionGroupToForm(group));
    } else {
      setEditingOptionGroup(null);
      setOptionGroupForm(initialOptionGroupForm);
    }
    setOptionGroupDialogOpen(true);
  };

  const closeOptionGroupDialog = () => {
    setOptionGroupDialogOpen(false);
    setEditingOptionGroup(null);
    setOptionGroupForm(initialOptionGroupForm);
    setOptionGroupError(null);
  };

  const handleSubmitOptionGroup = async () => {
    setOptionGroupSaving(true);
    setOptionGroupError(null);
    try {
      if (editingOptionGroup) {
        await optionGroupsApi.updateGroup(editingOptionGroup.id, optionGroupForm);
      } else {
        await optionGroupsApi.createGroup(optionGroupForm);
      }
      closeOptionGroupDialog();
      await onDataUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setOptionGroupError(message);
    } finally {
      setOptionGroupSaving(false);
    }
  };

  const handleDeleteOptionGroup = async (id: string) => {
    try {
      await optionGroupsApi.deleteGroup(id);
      await onDataUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      actions.showError(message);
    }
  };

  const openKitchenPrinterDialog = (printer?: KitchenPrinter) => {
    setKitchenPrinterError(null);
    if (printer) {
      setEditingKitchenPrinter(printer);
      setKitchenPrinterForm(kitchenPrinterToForm(printer));
    } else {
      setEditingKitchenPrinter(null);
      setKitchenPrinterForm(initialKitchenPrinterForm);
    }
    setKitchenPrinterDialogOpen(true);
  };

  const closeKitchenPrinterDialog = () => {
    setKitchenPrinterDialogOpen(false);
    setEditingKitchenPrinter(null);
    setKitchenPrinterForm(initialKitchenPrinterForm);
    setKitchenPrinterError(null);
  };

  const handleSubmitKitchenPrinter = async () => {
    setKitchenPrinterSaving(true);
    setKitchenPrinterError(null);
    try {
      if (editingKitchenPrinter) {
        await kitchenPrintersApi.updatePrinter(editingKitchenPrinter.id, kitchenPrinterForm);
      } else {
        await kitchenPrintersApi.createPrinter(kitchenPrinterForm);
      }
      closeKitchenPrinterDialog();
      await onDataUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setKitchenPrinterError(message);
    } finally {
      setKitchenPrinterSaving(false);
    }
  };

  const handleDeleteKitchenPrinter = async (id: string) => {
    try {
      await kitchenPrintersApi.deletePrinter(id);
      await onDataUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      actions.showError(message);
    }
  };

  const handleTestKitchenPrinter = async (id: string) => {
    try {
      await kitchenPrintersApi.testPrinter(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      actions.showError(message);
    }
  };

  const handleCloseSnackbar = () => {
    actions.closeSnackbar();
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
        <OptionGroupsSection
          groups={optionGroupsApi.groups}
          onCreateGroup={() => openOptionGroupDialog()}
          onEditGroup={openOptionGroupDialog}
          onDeleteGroup={handleDeleteOptionGroup}
        />

        <KitchenPrintersSection
          printers={kitchenPrintersApi.printers}
          onCreatePrinter={() => openKitchenPrinterDialog()}
          onEditPrinter={openKitchenPrinterDialog}
          onDeletePrinter={handleDeleteKitchenPrinter}
          onTestPrinter={handleTestKitchenPrinter}
        />

        {/* Category Section */}
        <CategorySection
          categories={categories}
          archivedCategories={state.archivedCategories}
          showArchived={state.showArchived}
          onCreateCategory={handleCreateCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={api.deleteCategory}
          onRestoreCategory={api.restoreCategory}
        />

        {/* Product Section */}
        <Box sx={{ mt: 2 }}>
          <ProductSection
            products={products}
            categories={categories}
            archivedProducts={state.archivedProducts}
            archivedCategories={state.archivedCategories}
            showArchived={state.showArchived}
            onCreateProduct={handleCreateProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={api.deleteProduct}
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
        optionGroups={optionGroupsApi.groups}
        kitchenPrinters={kitchenPrintersApi.printers}
        loading={false}
        error={null}
      />

      <KitchenPrinterDialog
        open={kitchenPrinterDialogOpen}
        onClose={closeKitchenPrinterDialog}
        onSubmit={handleSubmitKitchenPrinter}
        form={kitchenPrinterForm}
        onFormChange={setKitchenPrinterForm}
        editingPrinter={editingKitchenPrinter}
        loading={kitchenPrinterSaving}
        error={kitchenPrinterError}
      />

      <OptionGroupDialog
        open={optionGroupDialogOpen}
        onClose={closeOptionGroupDialog}
        onSubmit={handleSubmitOptionGroup}
        form={optionGroupForm}
        onFormChange={setOptionGroupForm}
        editingGroup={editingOptionGroup}
        loading={optionGroupSaving}
        error={optionGroupError}
      />
    </Box>
  );
};

export default MenuContainer;
