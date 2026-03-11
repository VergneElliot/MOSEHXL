import React, { useMemo, useState } from 'react';
import {
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
import { alpha } from '@mui/material/styles';
import { Product, OrderItem, Category } from '../../types';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  isHappyHourActive: boolean;
  onAddToOrder: (item: OrderItem, quantity: number) => void;
  calculateProductPrice: (product: Product, isHappyHour: boolean) => number;
  formatCurrency: (amount: number) => string;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  categories,
  isHappyHourActive,
  onAddToOrder,
  calculateProductPrice,
  formatCurrency,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const categoryColorMap = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    categories.forEach(category => {
      map[category.id] = category.color;
    });
    return map;
  }, [categories]);

  if (products.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="textSecondary">Aucun produit trouvé</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(auto-fill, minmax(190px, 1fr))',
          sm: 'repeat(auto-fill, minmax(210px, 1fr))',
          md: 'repeat(auto-fill, minmax(220px, 1fr))',
          lg: 'repeat(auto-fill, minmax(230px, 1fr))',
        },
        gap: 2,
        alignItems: 'stretch',
      }}
    >
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          categoryColor={categoryColorMap[product.categoryId]}
          isHappyHourActive={isHappyHourActive}
          onAddToOrder={onAddToOrder}
          calculateProductPrice={calculateProductPrice}
          formatCurrency={formatCurrency}
          isMobile={isMobile}
        />
      ))}
    </Box>
  );
};

interface ProductCardProps {
  product: Product;
  categoryColor?: string;
  isHappyHourActive: boolean;
  onAddToOrder: (item: OrderItem, quantity: number) => void;
  calculateProductPrice: (product: Product, isHappyHour: boolean) => number;
  formatCurrency: (amount: number) => string;
  isMobile: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  categoryColor,
  isHappyHourActive,
  onAddToOrder,
  calculateProductPrice,
  formatCurrency,
  isMobile,
}) => {
  const theme = useTheme();
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

  const resolvedBackground = categoryColor
    ? alpha(categoryColor, 0.12)
    : theme.palette.background.paper;

  const resolvedBorder = categoryColor
    ? alpha(categoryColor, 0.6)
    : theme.palette.divider;

  return (
    <Card
      sx={{
        height: '100%',
        minHeight: isMobile ? 160 : 200,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${resolvedBorder}`,
        backgroundColor: resolvedBackground,
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
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

      <CardContent
        sx={{
          p: isMobile ? 1 : 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
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

        <Box
          display="flex"
          flexDirection="column"
          alignItems="stretch"
          gap={1}
          sx={{ flex: 1, justifyContent: 'space-between' }}
        >
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

          <Box
            display="flex"
            alignItems="center"
            gap={0.5}
            sx={{ width: '100%', mt: 0.5 }}
          >
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
              sx={{ minWidth: 22, textAlign: 'center', fontWeight: 'bold' }}
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
              size="small"
              fullWidth
              onClick={handleAdd}
              sx={{
                minHeight: isMobile ? 30 : 32,
                py: isMobile ? 0.5 : 0.75,
                fontSize: isMobile ? '0.7rem' : '0.8rem',
              }}
            >
              Ajouter
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProductGrid;
