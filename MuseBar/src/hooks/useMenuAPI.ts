import { useCallback, useMemo } from 'react';
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
        const result = await dataService.deleteCategory(id);
        showSuccess(result.message || 'Catégorie supprimée avec succès');
        await onDataUpdate();
        loadArchivedCategories();
        loadArchivedProducts();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, onDataUpdate, loadArchivedCategories, loadArchivedProducts]
  );

  const archiveCategory = useCallback(
    async (id: string) => {
      try {
        await dataService.updateCategory(id, { isActive: false });
        showSuccess('Catégorie archivée avec succès');
        await onDataUpdate();
        loadArchivedCategories();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, onDataUpdate, loadArchivedCategories]
  );

  const restoreCategory = useCallback(
    async (id: string) => {
      try {
        await dataService.restoreCategory(id);
        showSuccess('Catégorie restaurée avec succès');
        await onDataUpdate();
        loadArchivedCategories();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, onDataUpdate, loadArchivedCategories]
  );

  const createProduct = useCallback(
    async (productData: ProductFormData) => {
      try {
        const processedData = {
          ...productData,
          price: parseFloat(productData.price),
          happyHourDiscountValue: parseFloat(productData.happyHourDiscountValue),
          isActive: true,
          optionGroupIds: productData.optionGroupIds,
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
          optionGroupIds: productData.optionGroupIds,
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
        const result = await dataService.deleteProduct(id);
        const message = result?.message ?? 'Produit supprimé avec succès';
        showSuccess(message);
        await onDataUpdate();
        loadArchivedProducts();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, onDataUpdate, loadArchivedProducts]
  );

  const archiveProduct = useCallback(
    async (id: string) => {
      try {
        await dataService.updateProduct(id, { isActive: false });
        showSuccess('Produit archivé avec succès');
        await onDataUpdate();
        loadArchivedProducts();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, onDataUpdate, loadArchivedProducts]
  );

  const restoreProduct = useCallback(
    async (id: string) => {
      try {
        await dataService.restoreProduct(id);
        showSuccess('Produit restauré avec succès');
        await onDataUpdate();
        loadArchivedProducts();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        showError(`Erreur: ${message}`);
      }
    },
    [dataService, showSuccess, showError, onDataUpdate, loadArchivedProducts]
  );

  return useMemo(
    () => ({
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
    }),
    [
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
    ]
  );
};
