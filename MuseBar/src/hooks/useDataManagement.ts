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

export const useDataManagement = (): DataState & DataActions => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataService = DataService.getInstance();

  const updateData = useCallback(async () => {
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
  }, [dataService]);

  const refreshData = useCallback(async () => {
    await updateData();
  }, [updateData]);

  // Initialize data on mount
  useEffect(() => {
    updateData();
  }, [updateData]);

  return {
    categories,
    products,
    isLoading,
    error,
    updateData,
    refreshData,
  };
}; 