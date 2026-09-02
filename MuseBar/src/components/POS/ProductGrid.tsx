import React, { useCallback, useMemo, useState } from 'react';
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
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Category as DiversIcon,
  VolunteerActivism as TipIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { VirtuosoGrid } from 'react-virtuoso';
import { Product, Category } from '../../types';
import { POS_PRODUCT_DND_MIME } from './posProductDnD';
import { setCompactDragGhost } from './posDragGhost';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  isHappyHourActive: boolean;
  onRequestAddProduct: (product: Product, quantity: number) => void;
  calculateProductPrice: (product: Product, isHappyHour: boolean) => number;
  formatCurrency: (amount: number) => string;
  onDiversClick?: () => void;
  onPourboireClick?: () => void;
  /** Product ids in establishment top sellers (Favoris). */
  favoriteProductIds?: ReadonlySet<string>;
  /** When false, use plain CSS grid (smoother scroll for typical catalog sizes). */
  useVirtualization?: boolean;
}

/**
 * Tall enough for Happy Hour cards (badge + strikethrough + price + qty/add).
 * Prefer minHeight over maxHeight/overflow:hidden so controls are never clipped.
 */
const CARD_MIN_HEIGHT_MOBILE = 200;
const CARD_MIN_HEIGHT_DESKTOP = 280;

const ProductGrid = React.memo(function ProductGrid({
  products,
  categories,
  isHappyHourActive,
  onRequestAddProduct,
  calculateProductPrice,
  formatCurrency,
  onDiversClick,
  onPourboireClick,
  favoriteProductIds,
  useVirtualization = false,
}: ProductGridProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isLarge = useMediaQuery(theme.breakpoints.up('lg'));
  // Breakpoint columns only — avoids ResizeObserver flapping with the scrollbar.
  const columnCount = isMobile ? 2 : isLarge ? 4 : 3;

  const categoryColorMap = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    categories.forEach(category => {
      map[category.id] = category.color;
    });
    return map;
  }, [categories]);

  const hasDiversSlot = Boolean(onDiversClick);
  const hasPourboireSlot = Boolean(onPourboireClick);
  const specialSlotCount = (hasDiversSlot ? 1 : 0) + (hasPourboireSlot ? 1 : 0);
  const totalCount = products.length + specialSlotCount;
  const cardMinHeight = isMobile ? CARD_MIN_HEIGHT_MOBILE : CARD_MIN_HEIGHT_DESKTOP;

  // Stable Virtuoso components: column count via CSS var (avoids remount flicker).
  const gridComponents = useMemo(
    () => ({
      List: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
        function ProductGridList({ style, children, ...props }, ref) {
          return (
            <Box
              ref={ref}
              component="div"
              {...props}
              style={style}
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(var(--pos-grid-cols, 2), minmax(0, 1fr))',
                gap: 2,
                alignContent: 'start',
              }}
            >
              {children}
            </Box>
          );
        }
      ),
      Item: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <Box
          component="div"
          {...props}
          sx={{
            height: 'var(--pos-grid-item-height, 280px)',
            minHeight: 'var(--pos-grid-item-height, 280px)',
            maxHeight: 'var(--pos-grid-item-height, 280px)',
            display: 'flex',
            width: '100%',
            overflow: 'hidden',
            contain: 'layout style paint',
          }}
        >
          {children}
        </Box>
      ),
    }),
    []
  );

  const computeItemKey = useCallback(
    (index: number) => {
      let offset = 0;
      if (hasDiversSlot) {
        if (index === offset) return 'divers';
        offset += 1;
      }
      if (hasPourboireSlot) {
        if (index === offset) return 'pourboire';
        offset += 1;
      }
      const product = products[index - offset];
      return product ? `product-${product.id}` : `idx-${index}`;
    },
    [hasDiversSlot, hasPourboireSlot, products]
  );

  const renderGridItem = useCallback(
    (index: number) => {
      let offset = 0;
      if (hasDiversSlot) {
        if (index === offset) {
          return <DiversCard onAdd={onDiversClick!} isMobile={isMobile} theme={theme} />;
        }
        offset += 1;
      }
      if (hasPourboireSlot) {
        if (index === offset) {
          return <PourboireCard onAdd={onPourboireClick!} isMobile={isMobile} theme={theme} />;
        }
        offset += 1;
      }

      const product = products[index - offset];
      if (!product) return null;

      return (
        <ProductCard
          product={product}
          categoryColor={categoryColorMap[product.categoryId]}
          isHappyHourActive={isHappyHourActive}
          isFavorite={favoriteProductIds?.has(String(product.id)) ?? false}
          onRequestAddProduct={onRequestAddProduct}
          calculateProductPrice={calculateProductPrice}
          formatCurrency={formatCurrency}
          isMobile={isMobile}
        />
      );
    },
    [
      hasDiversSlot,
      hasPourboireSlot,
      onDiversClick,
      onPourboireClick,
      isMobile,
      theme,
      products,
      categoryColorMap,
      isHappyHourActive,
      favoriteProductIds,
      onRequestAddProduct,
      calculateProductPrice,
      formatCurrency,
    ]
  );

  if (totalCount === 0) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="textSecondary">Aucun produit trouvé</Typography>
      </Box>
    );
  }

  if (!useVirtualization) {
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
        {onDiversClick && <DiversCard onAdd={onDiversClick} isMobile={isMobile} theme={theme} />}
        {onPourboireClick && (
          <PourboireCard onAdd={onPourboireClick} isMobile={isMobile} theme={theme} />
        )}
        {products.map(product => (
          <ProductCard
            key={`product-${product.id}`}
            product={product}
            categoryColor={categoryColorMap[product.categoryId]}
            isHappyHourActive={isHappyHourActive}
            isFavorite={favoriteProductIds?.has(String(product.id)) ?? false}
            onRequestAddProduct={onRequestAddProduct}
            calculateProductPrice={calculateProductPrice}
            formatCurrency={formatCurrency}
            isMobile={isMobile}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        ['--pos-grid-cols' as string]: columnCount,
        ['--pos-grid-item-height' as string]: `${cardMinHeight}px`,
      }}
    >
      <VirtuosoGrid
        style={{ height: '100%' }}
        totalCount={totalCount}
        overscan={columnCount * 2}
        components={gridComponents}
        computeItemKey={computeItemKey}
        itemContent={renderGridItem}
      />
    </Box>
  );
});

interface DiversCardProps {
  onAdd: () => void;
  isMobile: boolean;
  theme: Theme;
}

const DiversCard: React.FC<DiversCardProps> = ({ onAdd, isMobile, theme }) => {
  const border = theme.palette.divider;
  const bg = alpha(theme.palette.primary.main, 0.08);

  return (
    <Card
      draggable
      onDragStart={e => {
        const payload = JSON.stringify({ kind: 'divers' });
        e.dataTransfer.setData(POS_PRODUCT_DND_MIME, payload);
        e.dataTransfer.setData('text/plain', payload);
        e.dataTransfer.effectAllowed = 'copy';
        setCompactDragGhost(e, 'Divers');
      }}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: isMobile ? CARD_MIN_HEIGHT_MOBILE : CARD_MIN_HEIGHT_DESKTOP,
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${border}`,
        backgroundColor: bg,
        transition: 'box-shadow 0.15s ease',
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <CardContent
        sx={{
          p: isMobile ? 1 : 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <DiversIcon sx={{ fontSize: isMobile ? 20 : 24 }} color="primary" />
            <Typography
              variant={isMobile ? 'body2' : 'h6'}
              component="h3"
              sx={{ fontWeight: 'bold', fontSize: isMobile ? '1.3rem' : '2.3rem' }}
            >
              Divers
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            Article personnalisé (prix, TVA, description)
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          fullWidth
          onClick={e => {
            e.stopPropagation();
            onAdd();
          }}
          sx={{
            mt: 1,
            minHeight: isMobile ? 34 : 42,
            py: isMobile ? 0.5 : 0.75,
            fontSize: isMobile ? '1rem' : '1.9rem',
          }}
        >
          Ajouter
        </Button>
      </CardContent>
    </Card>
  );
};

interface PourboireCardProps {
  onAdd: () => void;
  isMobile: boolean;
  theme: Theme;
}

const PourboireCard: React.FC<PourboireCardProps> = ({ onAdd, isMobile, theme }) => {
  const border = theme.palette.divider;
  const bg = alpha(theme.palette.secondary.main, 0.08);

  return (
    <Card
      draggable
      onDragStart={e => {
        const payload = JSON.stringify({ kind: 'pourboire' });
        e.dataTransfer.setData(POS_PRODUCT_DND_MIME, payload);
        e.dataTransfer.setData('text/plain', payload);
        e.dataTransfer.effectAllowed = 'copy';
        setCompactDragGhost(e, 'Pourboire');
      }}
      sx={{
        width: '100%',
        height: '100%',
        minHeight: isMobile ? CARD_MIN_HEIGHT_MOBILE : CARD_MIN_HEIGHT_DESKTOP,
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${border}`,
        backgroundColor: bg,
        transition: 'box-shadow 0.15s ease',
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <CardContent
        sx={{
          p: isMobile ? 1 : 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <TipIcon sx={{ fontSize: isMobile ? 20 : 24 }} color="secondary" />
            <Typography
              variant={isMobile ? 'body2' : 'h6'}
              component="h3"
              sx={{ fontWeight: 'bold', fontSize: isMobile ? '1.3rem' : '2.3rem' }}
            >
              Pourboire
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            Pourboire carte (hors CA — +carte / −espèces)
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="secondary"
          size="small"
          fullWidth
          onClick={e => {
            e.stopPropagation();
            onAdd();
          }}
          sx={{
            mt: 1,
            minHeight: isMobile ? 34 : 42,
            py: isMobile ? 0.5 : 0.75,
            fontSize: isMobile ? '1rem' : '1.9rem',
          }}
        >
          Ajouter
        </Button>
      </CardContent>
    </Card>
  );
};

interface ProductCardProps {
  product: Product;
  categoryColor?: string;
  isHappyHourActive: boolean;
  isFavorite?: boolean;
  onRequestAddProduct: (product: Product, quantity: number) => void;
  calculateProductPrice: (product: Product, isHappyHour: boolean) => number;
  formatCurrency: (amount: number) => string;
  isMobile: boolean;
}

const ProductCard = React.memo(function ProductCard({
  product,
  categoryColor,
  isHappyHourActive,
  isFavorite = false,
  onRequestAddProduct,
  calculateProductPrice,
  formatCurrency,
  isMobile,
}: ProductCardProps) {
  const theme = useTheme();
  const [quantity, setQuantity] = useState(1);

  const currentPrice = calculateProductPrice(product, isHappyHourActive);
  const isDiscounted =
    isHappyHourActive && product.isHappyHourEligible && currentPrice < product.price;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setQuantity(1);
      return;
    }
    const v = parseInt(raw, 10);
    if (!Number.isNaN(v)) setQuantity(Math.min(999, Math.max(1, v)));
  };

  const handleQuantityBlur = () => {
    if (quantity < 1) setQuantity(1);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestAddProduct(product, quantity);
    setQuantity(1);
  };

  const resolvedBackground = categoryColor
    ? alpha(categoryColor, 0.2)
    : theme.palette.background.paper;

  const resolvedBorder = categoryColor
    ? alpha(categoryColor, 0.8)
    : theme.palette.divider;

  return (
    <Card
      draggable
      onDragStart={e => {
        e.dataTransfer.setData(
          POS_PRODUCT_DND_MIME,
          JSON.stringify({ kind: 'product', productId: product.id, quantity })
        );
        e.dataTransfer.setData(
          'text/plain',
          JSON.stringify({ kind: 'product', productId: product.id, quantity })
        );
        e.dataTransfer.effectAllowed = 'copy';
        const qtyLabel = quantity > 1 ? ` ×${quantity}` : '';
        setCompactDragGhost(e, `${product.name}${qtyLabel}`);
      }}
      sx={{
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: `1px solid ${resolvedBorder}`,
        backgroundColor: resolvedBackground,
        transition: 'box-shadow 0.15s ease',
        cursor: 'grab',
        contain: 'layout style paint',
        '&:active': { cursor: 'grabbing' },
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      {isFavorite && (
        <Box
          aria-label="Favori"
          title="Favori"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isMobile ? 28 : 34,
            height: isMobile ? 28 : 34,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.warning.main, 0.18),
            border: `1px solid ${alpha(theme.palette.warning.dark, 0.45)}`,
          }}
        >
          <StarIcon
            sx={{
              fontSize: isMobile ? 18 : 22,
              color: theme.palette.warning.dark,
            }}
          />
        </Box>
      )}

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
          flex: 1,
          minHeight: 0,
        }}
      >
        <Typography
          variant={isMobile ? 'body2' : 'h6'}
          component="h3"
          sx={{
            fontWeight: 'bold',
            mb: 1,
            fontSize: isMobile ? '1.3rem' : '2.4rem',
            lineHeight: 1.2,
            minHeight: '2.4em',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            flexShrink: 0,
            pl: isFavorite ? (isMobile ? 4 : 5) : 0,
            pr: isDiscounted ? 10 : 0,
          }}
        >
          {product.name}
        </Typography>

        <Box
          display="flex"
          flexDirection="column"
          alignItems="stretch"
          gap={1}
          sx={{ flex: 1, minHeight: 0 }}
        >
          {isDiscounted && (
            <Typography
              variant="body2"
              sx={{
                textDecoration: 'line-through',
                color: 'text.secondary',
                fontSize: isMobile ? '1rem' : '1.8rem',
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
              fontSize: isMobile ? '1.5rem' : '2.8rem',
            }}
          >
            {formatCurrency(currentPrice)}
          </Typography>

          <Box
            display="flex"
            alignItems="center"
            gap={0.5}
            sx={{ width: '100%', mt: 'auto', pt: 0.5, flexShrink: 0 }}
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
            <TextField
              type="number"
              variant="standard"
              value={quantity}
              onChange={handleQuantityChange}
              onBlur={handleQuantityBlur}
              onClick={e => e.stopPropagation()}
              inputProps={{
                min: 1,
                max: 999,
                onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select(),
              }}
              sx={{
                width: 44,
                '& .MuiInputBase-root': { fontSize: isMobile ? '1.2rem' : '2rem' },
                '& .MuiInputBase-input': {
                  textAlign: 'center',
                  py: 0,
                  fontWeight: 'bold',
                  MozAppearance: 'textfield',
                  '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                    WebkitAppearance: 'none',
                    margin: 0,
                  },
                },
              }}
              size="small"
            />
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
                minHeight: isMobile ? 34 : 42,
                py: isMobile ? 0.5 : 0.75,
                fontSize: isMobile ? '1rem' : '1.9rem',
              }}
            >
              Ajouter
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
});

export default ProductGrid;
