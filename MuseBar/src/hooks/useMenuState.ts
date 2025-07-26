import { useState } from 'react';
import { Category, Product } from '../types';

export interface CategoryFormData {
  name: string;
  description: string;
  color: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  taxRate: number;
  categoryId: string;
  isHappyHourEligible: boolean;
  happyHourDiscountType: 'percentage' | 'fixed';
  happyHourDiscountValue: string;
}

export interface MenuState {
  // Dialog states
  categoryDialogOpen: boolean;
  productDialogOpen: boolean;
  editingCategory: Category | null;
  editingProduct: Product | null;
  
  // Archive states
  showArchived: boolean;
  archivedProducts: Product[];
  archivedCategories: Category[];
  
  // Form states
  categoryForm: CategoryFormData;
  productForm: ProductFormData;
  
  // UI states
  snackbar: {
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  };
}

export interface MenuActions {
  // Dialog actions
  setCategoryDialogOpen: (open: boolean) => void;
  setProductDialogOpen: (open: boolean) => void;
  setEditingCategory: (category: Category | null) => void;
  setEditingProduct: (product: Product | null) => void;
  openCategoryDialog: (category?: Category) => void;
  closeCategoryDialog: () => void;
  openProductDialog: (product?: Product) => void;
  closeProductDialog: () => void;
  
  // Archive actions
  setShowArchived: (show: boolean) => void;
  setArchivedProducts: (products: Product[]) => void;
  setArchivedCategories: (categories: Category[]) => void;
  
  // Form actions
  setCategoryForm: (form: CategoryFormData) => void;
  setProductForm: (form: ProductFormData) => void;
  updateCategoryForm: (field: keyof CategoryFormData, value: string) => void;
  updateProductForm: (field: keyof ProductFormData, value: any) => void;
  resetForms: () => void;
  
  // UI actions
  setSnackbar: (snackbar: { open: boolean; message: string; severity: 'success' | 'error' }) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  closeSnackbar: () => void;
}

const initialCategoryForm: CategoryFormData = {
  name: '',
  description: '',
  color: '#1976d2'
};

const initialProductForm: ProductFormData = {
  name: '',
  description: '',
  price: '',
  taxRate: 0.20,
  categoryId: '',
  isHappyHourEligible: false,
  happyHourDiscountType: 'percentage',
  happyHourDiscountValue: '0'
};

export const useMenuState = (): [MenuState, MenuActions] => {
  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Archive states
  const [showArchived, setShowArchived] = useState(false);
  const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);
  const [archivedCategories, setArchivedCategories] = useState<Category[]>([]);
  
  // Form states
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(initialCategoryForm);
  const [productForm, setProductForm] = useState<ProductFormData>(initialProductForm);
  
  // UI states
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Dialog helper actions
  const openCategoryDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        color: category.color || '#1976d2'
      });
    } else {
      setEditingCategory(null);
      setCategoryForm(initialCategoryForm);
    }
    setCategoryDialogOpen(true);
  };

  const closeCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryForm(initialCategoryForm);
  };

  const openProductDialog = (product?: Product) => {
    if (product) {
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
    } else {
      setEditingProduct(null);
      setProductForm(initialProductForm);
    }
    setProductDialogOpen(true);
  };

  const closeProductDialog = () => {
    setProductDialogOpen(false);
    setEditingProduct(null);
    setProductForm(initialProductForm);
  };

  // Form helper actions
  const updateCategoryForm = (field: keyof CategoryFormData, value: string) => {
    setCategoryForm(prev => ({ ...prev, [field]: value }));
  };

  const updateProductForm = (field: keyof ProductFormData, value: any) => {
    setProductForm(prev => ({ ...prev, [field]: value }));
  };

  const resetForms = () => {
    setCategoryForm(initialCategoryForm);
    setProductForm(initialProductForm);
  };

  // UI helper actions
  const showSuccess = (message: string) => {
    setSnackbar({ open: true, message, severity: 'success' });
  };

  const showError = (message: string) => {
    setSnackbar({ open: true, message, severity: 'error' });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const state: MenuState = {
    categoryDialogOpen,
    productDialogOpen,
    editingCategory,
    editingProduct,
    showArchived,
    archivedProducts,
    archivedCategories,
    categoryForm,
    productForm,
    snackbar,
  };

  const actions: MenuActions = {
    setCategoryDialogOpen,
    setProductDialogOpen,
    setEditingCategory,
    setEditingProduct,
    openCategoryDialog,
    closeCategoryDialog,
    openProductDialog,
    closeProductDialog,
    setShowArchived,
    setArchivedProducts,
    setArchivedCategories,
    setCategoryForm,
    setProductForm,
    updateCategoryForm,
    updateProductForm,
    resetForms,
    setSnackbar,
    showSuccess,
    showError,
    closeSnackbar,
  };

  return [state, actions];
}; 