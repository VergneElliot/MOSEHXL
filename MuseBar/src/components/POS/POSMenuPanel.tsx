import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import type { Category, Product } from '../../types';
import { usePOSCatalogLogic, FAVORITES_CATEGORY_ID } from '../../hooks/usePOSCatalogLogic';
import { useTopSellerProductIds } from '../../hooks/useTopSellerProductIds';
import CategoryFilter from './CategoryFilter';
import ProductGrid from './ProductGrid';

export interface POSMenuPanelProps {
  categories: Category[];
  products: Product[];
  isHappyHourActive: boolean;
  selectedCategory: string;
  searchQuery: string;
  onCategorySelect: (categoryId: string) => void;
  onRequestAddProduct: (product: Product, quantity: number) => void;
  onDiversClick: () => void;
  onPourboireClick: () => void;
}

const POSMenuPanel = React.memo(function POSMenuPanel({
  categories,
  products,
  isHappyHourActive,
  selectedCategory,
  searchQuery,
  onCategorySelect,
  onRequestAddProduct,
  onDiversClick,
  onPourboireClick,
}: POSMenuPanelProps) {
  const topSellerProductIds = useTopSellerProductIds(true, 10);
  const favoriteProductIds = useMemo(
    () => new Set(topSellerProductIds.map(String)),
    [topSellerProductIds]
  );
  const { filteredProducts, calculateProductPrice, formatCurrency } = usePOSCatalogLogic(
    products,
    categories,
    selectedCategory,
    searchQuery,
    isHappyHourActive,
    topSellerProductIds
  );

  const catalogView = searchQuery.trim()
    ? 'search'
    : selectedCategory === FAVORITES_CATEGORY_ID
      ? 'favoris'
      : selectedCategory || 'tous';

  /** Star badge only on Tous and Favoris — not category filter or search. */
  const showFavoriteBadge = catalogView === 'tous' || catalogView === 'favoris';

  return (
    <>
      <Box sx={{ flexShrink: 0 }}>
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={onCategorySelect}
        />
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          scrollbarGutter: 'stable',
        }}
      >
        <ProductGrid
          key={catalogView}
          products={filteredProducts}
          categories={categories}
          isHappyHourActive={isHappyHourActive}
          onRequestAddProduct={onRequestAddProduct}
          calculateProductPrice={calculateProductPrice}
          formatCurrency={formatCurrency}
          onDiversClick={onDiversClick}
          onPourboireClick={onPourboireClick}
          favoriteProductIds={favoriteProductIds}
          showFavoriteBadge={showFavoriteBadge}
        />
      </Box>
    </>
  );
});

export default POSMenuPanel;
