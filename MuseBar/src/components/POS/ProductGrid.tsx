import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  useTheme,
  useMediaQuery,
  Box,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import { Product, OrderItem } from '../../types';

interface ProductGridProps {
  products: Product[];
  isHappyHourActive: boolean;
  onAddToOrder: (item: OrderItem, quantity: number) => void;
  calculateProductPrice: (product: Product, isHappyHour: boolean) => number;
  formatCurrency: (amount: number) => string;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  isHappyHourActive,
  onAddToOrder,
  calculateProductPrice,
  formatCurrency,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (products.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="textSecondary">Aucun produit trouvé</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          isHappyHourActive={isHappyHourActive}
          onAddToOrder={onAddToOrder}
          calculateProductPrice={calculateProductPrice}
          formatCurrency={formatCurrency}
          isMobile={isMobile}
        />
      ))}
    </Grid>
  );
};

interface ProductCardProps {
  product: Product;
  isHappyHourActive: boolean;
  onAddToOrder: (item: OrderItem, quantity: number) => void;
  calculateProductPrice: (product: Product, isHappyHour: boolean) => number;
  formatCurrency: (amount: number) => string;
  isMobile: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isHappyHourActive,
  onAddToOrder,
  calculateProductPrice,
  formatCurrency,
  isMobile,
}) => {
  const [quantity, setQuantity] = useState(1);

  const currentPrice = calculateProductPrice(product, isHappyHourActive);
  const isDiscounted =
    isHappyHourActive && product.isHappyHourEligible && currentPrice < product.price;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const taxAmount = currentPrice * (product.taxRate / (1 + product.taxRate));
    const orderItem: OrderItem = {
      id: `${Date.now()}-${Math.random()}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: currentPrice,
      totalPrice: currentPrice,
      taxRate: product.taxRate,
      taxAmount,
      isHappyHourApplied: isHappyHourActive && product.isHappyHourEligible,
      isOffert: false,
      isPerso: false,
      originalPrice: product.price,
    };
    onAddToOrder(orderItem, quantity);
    setQuantity(1);
  };

  return (
    <Grid item xs={6} sm={4} md={3} lg={2}>
      <Card
        sx={{
          height: '100%',
          '&:hover': { boxShadow: 3 },
          position: 'relative',
        }}
      >
        {isDiscounted && (
          <Chip
            label="Happy Hour"
            color="secondary"
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
            }}
          />
        )}

        <CardContent sx={{ p: isMobile ? 1 : 2 }}>
          <Typography
            variant={isMobile ? 'body2' : 'h6'}
            component="h3"
            sx={{
              fontWeight: 'bold',
              mb: 1,
              fontSize: isMobile ? '0.875rem' : '1.1rem',
              lineHeight: 1.2,
              height: isMobile ? '2.4em' : 'auto',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {product.name}
          </Typography>

          <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
            {isDiscounted && (
              <Typography
                variant="body2"
                sx={{
                  textDecoration: 'line-through',
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                }}
              >
                {formatCurrency(product.price)}
              </Typography>
            )}

            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              color={isDiscounted ? 'secondary' : 'primary'}
              sx={{
                fontWeight: 'bold',
                fontSize: isMobile ? '1rem' : '1.2rem',
              }}
            >
              {formatCurrency(currentPrice)}
            </Typography>

            <Box display="flex" alignItems="center" gap={0.5} sx={{ width: '100%', mt: 1 }}>
              <IconButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  setQuantity(q => Math.max(1, q - 1));
                }}
                aria-label="Diminuer la quantité"
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
              <Typography
                variant="body2"
                sx={{ minWidth: 24, textAlign: 'center', fontWeight: 'bold' }}
              >
                {quantity}
              </Typography>
              <IconButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  setQuantity(q => q + 1);
                }}
                aria-label="Augmenter la quantité"
              >
                <AddIcon fontSize="small" />
              </IconButton>
              <Button
                variant="contained"
                size={isMobile ? 'small' : 'medium'}
                fullWidth
                onClick={handleAdd}
                sx={{
                  minHeight: isMobile ? 32 : 36,
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                }}
              >
                Ajouter
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
};

export default ProductGrid;
