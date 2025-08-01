import { useState, useEffect, useCallback } from 'react';
import { DataService } from '../services/dataService';
import { Category, Product } from '../types';

interface DataState {
  categories: Category[];
  products: Product[];
  isLoading: boolean;
  error: string | null;
}

interface DataActions {
  updateData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useDataManagement = (enabled: boolean = true): DataState & DataActions => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataService = DataService.getInstance();

  const updateData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [categoriesData, productsData] = await Promise.all([
        dataService.getCategories(),
        dataService.getProducts(),
      ]);

      setCategories(categoriesData);
      setProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [dataService, enabled]);

  const refreshData = useCallback(async () => {
    await updateData();
  }, [updateData]);

  // Initialize data on mount (only if enabled)
  useEffect(() => {
    if (enabled) {
      updateData();
    }
  }, [updateData, enabled]);

  return {
    categories,
    products,
    isLoading,
    error,
    updateData,
    refreshData,
  };
}; 