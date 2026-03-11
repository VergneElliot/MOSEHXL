import { useState, useEffect, useCallback, useRef } from 'react';
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
  const hasLoadedOnce = useRef(false);

  const updateData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      setError(null);
      return;
    }

    // Only show full-screen loading on initial load. Refreshes after e.g. creating an order
    // run without loading so the app stays mounted and snackbars (success/error) stay visible.
    const isInitialLoad = !hasLoadedOnce.current;
    if (isInitialLoad) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [categoriesData, productsData] = await Promise.all([
        dataService.getCategories(),
        dataService.getProducts(),
      ]);

      setCategories(categoriesData);
      setProducts(productsData);
      hasLoadedOnce.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [dataService, enabled]);

  const refreshData = useCallback(async () => {
    await updateData();
  }, [updateData]);

  // Initialize data on mount (only if enabled)
  useEffect(() => {
    if (enabled) {
      updateData();
    } else {
      hasLoadedOnce.current = false;
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