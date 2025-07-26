import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  LocalBar as ProductIcon,
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
  EuroSymbol,
  LocalOffer as DiscountIcon
} from '@mui/icons-material';
import { Product, Category } from '../../types';

interface ProductSectionProps {
  products: Product[];
  categories: Category[];
  archivedProducts: Product[];
  showArchived: boolean;
  onCreateProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onArchiveProduct: (id: string) => void;
  onRestoreProduct: (id: string) => void;
  formatCurrency: (amount: number) => string;
}

const ProductSection: React.FC<ProductSectionProps> = ({
  products,
  categories,
  archivedProducts,
  showArchived,
  onCreateProduct,
  onEditProduct,
  onDeleteProduct,
  onArchiveProduct,
  onRestoreProduct,
  formatCurrency,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const activeProducts = products.filter(prod => prod.isActive);

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Sans catégorie';
  };

  const getCategoryColor = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || theme.palette.grey[400];
  };

  return (
    <Accordion defaultExpanded>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="products-content"
        id="products-header"
      >
        <Box display="flex" alignItems="center" width="100%">
          <ProductIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Gestion des Produits ({activeProducts.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onCreateProduct();
            }}
            size={isMobile ? "small" : "medium"}
          >
            Nouveau Produit
          </Button>
        </Box>
      </AccordionSummary>
      
      <AccordionDetails>
        {activeProducts.length === 0 ? (
          <Box textAlign="center" py={3}>
            <Typography color="textSecondary">
              Aucun produit actif. Créez votre premier produit pour commencer.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {activeProducts.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    borderLeft: `4px solid ${getCategoryColor(product.categoryId)}`,
                    '&:hover': { boxShadow: 3 }
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6" component="h3" sx={{ flexGrow: 1, fontSize: '1rem' }}>
                        {product.name}
                      </Typography>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => onEditProduct(product)}
                          title="Modifier"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onArchiveProduct(product.id)}
                          title="Archiver"
                          color="warning"
                        >
                          <ArchiveIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onDeleteProduct(product.id)}
                          title="Supprimer"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    {product.description && (
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        {product.description}
                      </Typography>
                    )}
                    
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <EuroSymbol fontSize="small" color="primary" />
                      <Typography variant="h6" color="primary" fontWeight="bold">
                        {formatCurrency(product.price)}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" flexWrap="wrap" gap={0.5} mb={1}>
                      <Chip
                        size="small"
                        label={getCategoryName(product.categoryId)}
                        sx={{
                          backgroundColor: `${getCategoryColor(product.categoryId)}20`,
                          color: getCategoryColor(product.categoryId),
                        }}
                      />
                      
                      <Chip
                        size="small"
                        label={`TVA ${Math.round(product.taxRate * 100)}%`}
                        variant="outlined"
                      />
                      
                      {product.isHappyHourEligible && (
                        <Chip
                          size="small"
                          label="Happy Hour"
                          color="secondary"
                          icon={<DiscountIcon fontSize="small" />}
                        />
                      )}
                    </Box>
                    
                    {product.isHappyHourEligible && (
                      <Typography variant="caption" color="textSecondary">
                        Réduction: {product.happyHourDiscountType === 'percentage' 
                          ? `${Math.round(product.happyHourDiscountValue * 100)}%`
                          : formatCurrency(product.happyHourDiscountValue)
                        }
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Archived Products */}
        {showArchived && archivedProducts.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" gutterBottom color="textSecondary">
              📁 Produits Archivés ({archivedProducts.length})
            </Typography>
            <Grid container spacing={2}>
              {archivedProducts.map((product) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      opacity: 0.7,
                      borderLeft: `4px solid ${theme.palette.grey[400]}`,
                    }}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6" component="h3" sx={{ flexGrow: 1, fontSize: '1rem' }}>
                          {product.name}
                        </Typography>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => onRestoreProduct(product.id)}
                            title="Restaurer"
                            color="success"
                          >
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => onDeleteProduct(product.id)}
                            title="Supprimer définitivement"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      <Typography variant="h6" color="textSecondary">
                        {formatCurrency(product.price)}
                      </Typography>
                      
                      <Chip
                        size="small"
                        label="Archivé"
                        color="default"
                        variant="outlined"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default ProductSection; 