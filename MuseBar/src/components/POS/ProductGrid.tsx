import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  useTheme,
  useMediaQuery,
  Box
} from '@mui/material';
import { Product, OrderItem } from '../../types';

interface ProductGridProps {
  products: Product[];
  isHappyHourActive: boolean;
  onAddToOrder: (item: OrderItem) => void;
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
  
  const handleAddProduct = (product: Product) => {
    const currentPrice = calculateProductPrice(product, isHappyHourActive);
    const taxAmount = currentPrice * (product.taxRate / (1 + product.taxRate));
    
    const orderItem: OrderItem = {
      id: `${Date.now()}-${Math.random()}`,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: currentPrice,
      totalPrice: currentPrice,
      taxRate: product.taxRate,
      taxAmount: taxAmount,
      isHappyHourApplied: isHappyHourActive && product.isHappyHourEligible,
      isOffert: false,
      isPerso: false,
      originalPrice: product.price
    };
    
    onAddToOrder(orderItem);
  };

  if (products.length === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="textSecondary">
          Aucun produit trouvé
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {products.map((product) => {
        const currentPrice = calculateProductPrice(product, isHappyHourActive);
        const isDiscounted = isHappyHourActive && product.isHappyHourEligible && currentPrice < product.price;
        
        return (
          <Grid item xs={6} sm={4} md={3} lg={2} key={product.id}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                '&:hover': { boxShadow: 3 },
                position: 'relative'
              }}
              onClick={() => handleAddProduct(product)}
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
                    zIndex: 1
                  }}
                />
              )}
              
              <CardContent sx={{ p: isMobile ? 1 : 2 }}>
                <Typography 
                  variant={isMobile ? "body2" : "h6"} 
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
                    WebkitBoxOrient: 'vertical'
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
                        fontSize: '0.75rem'
                      }}
                    >
                      {formatCurrency(product.price)}
                    </Typography>
                  )}
                  
                  <Typography
                    variant={isMobile ? "h6" : "h5"}
                    color={isDiscounted ? "secondary" : "primary"}
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: isMobile ? '1rem' : '1.2rem'
                    }}
                  >
                    {formatCurrency(currentPrice)}
                  </Typography>
                  
                  <Button
                    variant="contained"
                    size={isMobile ? "small" : "medium"}
                    fullWidth
                    sx={{
                      mt: 1,
                      minHeight: isMobile ? 32 : 36,
                      fontSize: isMobile ? '0.75rem' : '0.875rem'
                    }}
                  >
                    Ajouter
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default ProductGrid; 