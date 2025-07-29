import React from 'react';
import { Category, Product } from '../types';
import POSContainer from './POS/POSContainer';

interface POSProps {
  categories: Category[];
  products: Product[];
  isHappyHourActive: boolean;
  onDataUpdate: () => void;
}

const POS: React.FC<POSProps> = ({ categories, products, isHappyHourActive, onDataUpdate }) => {
  return (
    <POSContainer
      categories={categories}
      products={products}
      isHappyHourActive={isHappyHourActive}
      onDataUpdate={onDataUpdate}
    />
  );
};

export default POS; 