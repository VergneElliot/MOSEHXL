import { useEffect, useState } from 'react';
import * as productsApi from '../services/api/products';
import { logger } from '../utils/logger';

/** Top product ids by sales quantity (establishment-wide), popularity order. */
export function useTopSellerProductIds(enabled: boolean, limit = 10): string[] {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) {
      setIds([]);
      return;
    }
    let cancelled = false;
    void productsApi
      .getTopSellers(limit)
      .then((rows) => {
        if (!cancelled) {
          setIds(rows.map((r) => String(r.product_id)));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          if (import.meta.env.DEV) {
            logger.warn('[Favoris] Failed to load top sellers from order history', error);
          }
          setIds([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, limit]);

  return ids;
}
