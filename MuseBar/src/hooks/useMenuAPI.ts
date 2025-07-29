import { useCallback } from 'react';
import { DataService } from '../services/dataService';
import { Category, Product } from '../types';
import { CategoryFormData, ProductFormData } from './useMenuState';

export interface MenuAPIActions {
  createCategory: (categoryData: CategoryFormData) => Promise<void>;
  updateCategory: (id: string, categoryData: CategoryFormData) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  archiveCategory: (id: string) => Promise<void>;
  restoreCategory: (id: string) => Promise<void>;

  createProduct: (productData: ProductFormData) => Promise<void>;
  updateProduct: (id: string, productData: ProductFormData) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  archiveProduct: (id: string) => Promise<void>;
  restoreProduct: (id: string) => Promise<void>;

  loadArchivedProducts: () => Promise<void>;
  loadArchivedCategories: () => Promise<void>;
}

export const useMenuAPI = (
  setArchivedProducts: (products: Product[]) => void,
  setArchivedCategories: (categories: Category[]) => void,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
  closeCategoryDialog: () => void,
  closeProductDialog: () => void,
  onDataUpdate: () => void
): MenuAPIActions => {
  const dataService = DataService.getInstance();

  const createCategory = useCallback(
    async (categoryData: CategoryFormData) => {
      try {
        await dataService.createCategory(categoryData);
        showSuccess('Catégorie créée avec succès');
        closeCategoryDialog();
        await onDataUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, closeCategoryDialog, onDataUpdate]
  );

  const updateCategory = useCallback(
    async (id: string, categoryData: CategoryFormData) => {
      try {
        await dataService.updateCategory(id, {
          name: categoryData.name,
          description: categoryData.description,
          color: categoryData.color,
        });
        showSuccess('Catégorie mise à jour avec succès');
        closeCategoryDialog();
        await onDataUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, closeCategoryDialog, onDataUpdate]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      try {
        await dataService.deleteCategory(id);
        showSuccess('Catégorie supprimée avec succès');
        await onDataUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, onDataUpdate]
  );

  const archiveCategory = useCallback(
    async (id: string) => {
      try {
        // Use soft delete instead of archive if no archive method exists
        await dataService.updateCategory(id, { isActive: false });
        showSuccess('Catégorie archivée avec succès');
        await onDataUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, onDataUpdate]
  );

  const restoreCategory = useCallback(
    async (id: string) => {
      try {
        // Use soft restore instead of restore if no restore method exists
        await dataService.updateCategory(id, { isActive: true });
        showSuccess('Catégorie restaurée avec succès');
        await onDataUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, onDataUpdate]
  );

  const createProduct = useCallback(
    async (productData: ProductFormData) => {
      try {
        const processedData = {
          ...productData,
          price: parseFloat(productData.price),
          happyHourDiscountValue: parseFloat(productData.happyHourDiscountValue),
          isActive: true,
        };
        await dataService.createProduct(processedData);
        showSuccess('Produit créé avec succès');
        closeProductDialog();
        await onDataUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, closeProductDialog, onDataUpdate]
  );

  const updateProduct = useCallback(
    async (id: string, productData: ProductFormData) => {
      try {
        const processedData = {
          ...productData,
          price: parseFloat(productData.price),
          happyHourDiscountValue: parseFloat(productData.happyHourDiscountValue),
          isActive: true,
        };
        await dataService.updateProduct(id, processedData);
        showSuccess('Produit mis à jour avec succès');
        closeProductDialog();
        await onDataUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, closeProductDialog, onDataUpdate]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      try {
        await dataService.deleteProduct(id);
        showSuccess('Produit supprimé avec succès');
        await onDataUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, onDataUpdate]
  );

  const archiveProduct = useCallback(
    async (id: string) => {
      try {
        // Use soft delete instead of archive if no archive method exists
        await dataService.updateProduct(id, { isActive: false });
        showSuccess('Produit archivé avec succès');
        await onDataUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, onDataUpdate]
  );

  const restoreProduct = useCallback(
    async (id: string) => {
      try {
        // Use soft restore instead of restore if no restore method exists
        await dataService.updateProduct(id, { isActive: true });
        showSuccess('Produit restauré avec succès');
        await onDataUpdate();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, onDataUpdate]
  );

  const loadArchivedProducts = useCallback(async () => {
    try {
      const archived = await dataService.getArchivedProducts();
      setArchivedProducts(archived);
    } catch (error) {
      console.error('Error loading archived products:', error);
      showError('Erreur lors du chargement des produits archivés');
    }
  }, [dataService, setArchivedProducts, showError]);

  const loadArchivedCategories = useCallback(async () => {
    try {
      const archived = await dataService.getArchivedCategories();
      setArchivedCategories(archived);
    } catch (error) {
      console.error('Error loading archived categories:', error);
      showError('Erreur lors du chargement des catégories archivées');
    }
  }, [dataService, setArchivedCategories, showError]);

  return {
    createCategory,
    updateCategory,
    deleteCategory,
    archiveCategory,
    restoreCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    archiveProduct,
    restoreProduct,
    loadArchivedProducts,
    loadArchivedCategories,
  };
};
