import React from 'react';
import { Box } from '@mui/material';
import type { Category, Product } from '../../types';
import { usePOSCatalogLogic } from '../../hooks/usePOSCatalogLogic';
import CategoryFilter from './CategoryFilter';
import ProductGrid from './ProductGrid';
import { canUseVirtualization } from '../../utils/canUseVirtualization';

export interface POSMenuPanelProps {
  categories: Category[];
  products: Product[];
  isHappyHourActive: boolean;
  selectedCategory: string;
  searchQuery: string;
  onCategorySelect: (categoryId: string) => void;
  onSearchChange: (query: string) => void;
  onRequestAddProduct: (product: Product, quantity: number) => void;
  onDiversClick: () => void;
}

const POSMenuPanel = React.memo(function POSMenuPanel({
  categories,
  products,
  isHappyHourActive,
  selectedCategory,
  searchQuery,
  onCategorySelect,
  onSearchChange,
  onRequestAddProduct,
  onDiversClick,
}: POSMenuPanelProps) {
  const { filteredProducts, calculateProductPrice, formatCurrency } = usePOSCatalogLogic(
    products,
    categories,
    selectedCategory,
    searchQuery,
    isHappyHourActive
  );

  return (
    <>
      <Box sx={{ flexShrink: 0 }}>
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          onCategorySelect={onCategorySelect}
          onSearchChange={onSearchChange}
        />
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: canUseVirtualization() ? 'hidden' : 'auto',
        }}
      >
        <ProductGrid
          products={filteredProducts}
          categories={categories}
          isHappyHourActive={isHappyHourActive}
          onRequestAddProduct={onRequestAddProduct}
          calculateProductPrice={calculateProductPrice}
          formatCurrency={formatCurrency}
          onDiversClick={onDiversClick}
        />
      </Box>
    </>
  );
});

export default POSMenuPanel;
