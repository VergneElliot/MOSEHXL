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
  updateData: () => Promise<boolean>;
  refreshData: () => Promise<void>;
}

/**
 * POS catalog loader. Pass `enabled=true` only when a PIN session can authorize
 * catalog reads — JWT alone gets 403 and must not auto-poll.
 */
export const useDataManagement = (enabled: boolean = true): DataState & DataActions => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dataService = DataService.getInstance();
  const hasLoadedOnce = useRef(false);
  /** Shared promise so StrictMode double-mount / parallel callers await the same load. */
  const inFlightPromise = useRef<Promise<boolean> | null>(null);

  const updateData = useCallback(async (): Promise<boolean> => {
    if (inFlightPromise.current) return inFlightPromise.current;

    const isInitialLoad = !hasLoadedOnce.current;
    if (isInitialLoad) setIsLoading(true);
    setError(null);

    inFlightPromise.current = (async () => {
      try {
        const [categoriesData, productsData] = await Promise.all([
          dataService.getCategories(),
          dataService.getProducts(),
        ]);

        setCategories(categoriesData);
        setProducts(productsData);
        hasLoadedOnce.current = true;
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        if (/PIN session required/i.test(message)) {
          setError(null);
          return false;
        }
        setError(message);
        return false;
      } finally {
        inFlightPromise.current = null;
        if (isInitialLoad) setIsLoading(false);
      }
    })();

    return inFlightPromise.current;
  }, [dataService]);

  const refreshData = useCallback(async () => {
    await updateData();
  }, [updateData]);

  useEffect(() => {
    if (!enabled) return;
    void updateData();
  }, [enabled, updateData]);

  return {
    categories,
    products,
    isLoading,
    error,
    updateData,
    refreshData,
  };
};
