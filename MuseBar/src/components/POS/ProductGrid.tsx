import React, { useMemo, useState } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import {
  Category as DiversIcon,
  VolunteerActivism as TipIcon,
} from '@mui/icons-material';
import { Product, Category } from '../../types';
import { POS_PRODUCT_DND_MIME } from './posProductDnD';
import { setCompactDragGhost } from './posDragGhost';
import './ProductGrid.css';

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
  /** When false, hide the star badge (category filter / search). */
  showFavoriteBadge?: boolean;
}

const ICON_ADD = 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z';
const ICON_REMOVE = 'M19 13H5v-2h14v2z';
const ICON_STAR =
  'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

function Glyph({ path }: { path: string }) {
  return (
    <svg className="pos-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={path} />
    </svg>
  );
}

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
  showFavoriteBadge = false,
}: ProductGridProps) {
  const theme = useTheme();

  const paletteStyle = useMemo(
    () =>
      ({
        '--pos-paper': theme.palette.background.paper,
        '--pos-divider': theme.palette.divider,
        '--pos-primary': theme.palette.primary.main,
        '--pos-primary-dark': theme.palette.primary.dark,
        '--pos-primary-contrast': theme.palette.primary.contrastText,
        '--pos-secondary': theme.palette.secondary.main,
        '--pos-secondary-dark': theme.palette.secondary.dark,
        '--pos-secondary-contrast': theme.palette.secondary.contrastText,
        '--pos-text-primary': theme.palette.text.primary,
        '--pos-text-secondary': theme.palette.text.secondary,
        '--pos-warning-bg': alpha(theme.palette.warning.main, 0.18),
        '--pos-warning-border': alpha(theme.palette.warning.dark, 0.45),
        '--pos-warning-dark': theme.palette.warning.dark,
        '--pos-action-active': theme.palette.action.active,
        '--pos-action-hover': theme.palette.action.hover,
        '--pos-shadow-1': theme.shadows[1],
        '--pos-shadow-2': theme.shadows[2],
      }) as React.CSSProperties,
    [theme]
  );

  /**
   * One style object per category, reused by every card in it — keeps the
   * `cardStyle` prop referentially stable so React.memo actually holds.
   */
  const categoryStyleMap = useMemo(() => {
    const map = new Map<string, React.CSSProperties>();
    categories.forEach(category => {
      if (!category.color) return;
      map.set(String(category.id), {
        '--pos-card-bg': alpha(category.color, 0.2),
        '--pos-card-border': alpha(category.color, 0.8),
      } as React.CSSProperties);
    });
    return map;
  }, [categories]);

  const totalCount =
    products.length + (onDiversClick ? 1 : 0) + (onPourboireClick ? 1 : 0);

  if (totalCount === 0) {
    return (
      <div className="pos-grid__empty" style={paletteStyle}>
        Aucun produit trouvé
      </div>
    );
  }

  return (
    <div className="pos-grid" style={paletteStyle}>
      {onDiversClick && <DiversCard onAdd={onDiversClick} />}
      {onPourboireClick && <PourboireCard onAdd={onPourboireClick} />}
      {products.map((product, index) => (
        <ProductCard
          // Tous view lists favorites then categories — same product.id can appear twice.
          key={`${index}:${product.id}`}
          product={product}
          cardStyle={categoryStyleMap.get(String(product.categoryId))}
          isHappyHourActive={isHappyHourActive}
          isFavorite={
            showFavoriteBadge && (favoriteProductIds?.has(String(product.id)) ?? false)
          }
          onRequestAddProduct={onRequestAddProduct}
          calculateProductPrice={calculateProductPrice}
          formatCurrency={formatCurrency}
        />
      ))}
    </div>
  );
});

function startSpecialDrag(
  event: React.DragEvent,
  kind: 'divers' | 'pourboire',
  label: string
) {
  const payload = JSON.stringify({ kind });
  event.dataTransfer.setData(POS_PRODUCT_DND_MIME, payload);
  event.dataTransfer.setData('text/plain', payload);
  event.dataTransfer.effectAllowed = 'copy';
  setCompactDragGhost(event, label);
}

const DiversCard = React.memo(function DiversCard({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="pos-card pos-card--special"
      draggable
      onDragStart={e => startSpecialDrag(e, 'divers', 'Divers')}
    >
      <div className="pos-card__content">
        <div>
          <div className="pos-card__special-header">
            <DiversIcon color="primary" style={{ fontSize: 'inherit' }} />
            <h3 className="pos-card__special-title">Divers</h3>
          </div>
          <p className="pos-card__special-description">
            Article personnalisé (prix, TVA, description)
          </p>
        </div>
        <button
          type="button"
          className="pos-add-button pos-add-button--block"
          onClick={e => {
            e.stopPropagation();
            onAdd();
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  );
});

const PourboireCard = React.memo(function PourboireCard({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="pos-card pos-card--special"
      draggable
      onDragStart={e => startSpecialDrag(e, 'pourboire', 'Pourboire')}
    >
      <div className="pos-card__content">
        <div>
          <div className="pos-card__special-header">
            <TipIcon color="secondary" style={{ fontSize: 'inherit' }} />
            <h3 className="pos-card__special-title">Pourboire</h3>
          </div>
          <p className="pos-card__special-description">
            Pourboire carte (hors CA — +carte / −espèces)
          </p>
        </div>
        <button
          type="button"
          className="pos-add-button pos-add-button--secondary pos-add-button--block"
          onClick={e => {
            e.stopPropagation();
            onAdd();
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  );
});

interface ProductCardProps {
  product: Product;
  /** Category colour custom properties; shared reference across the category. */
  cardStyle?: React.CSSProperties;
  isHappyHourActive: boolean;
  isFavorite?: boolean;
  onRequestAddProduct: (product: Product, quantity: number) => void;
  calculateProductPrice: (product: Product, isHappyHour: boolean) => number;
  formatCurrency: (amount: number) => string;
}

const ProductCard = React.memo(function ProductCard({
  product,
  cardStyle,
  isHappyHourActive,
  isFavorite = false,
  onRequestAddProduct,
  calculateProductPrice,
  formatCurrency,
}: ProductCardProps) {
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
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed)) setQuantity(Math.min(999, Math.max(1, parsed)));
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestAddProduct(product, quantity);
    setQuantity(1);
  };

  const handleDragStart = (e: React.DragEvent) => {
    const payload = JSON.stringify({
      kind: 'product',
      productId: product.id,
      quantity,
    });
    e.dataTransfer.setData(POS_PRODUCT_DND_MIME, payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'copy';
    setCompactDragGhost(e, `${product.name}${quantity > 1 ? ` ×${quantity}` : ''}`);
  };

  const className =
    'pos-card' +
    (isFavorite ? ' pos-card--favorite' : '') +
    (isDiscounted ? ' pos-card--discounted' : '');

  return (
    <div className={className} style={cardStyle} draggable onDragStart={handleDragStart}>
      {isFavorite && (
        <span className="pos-card__favorite" aria-label="Favori" title="Favori">
          <Glyph path={ICON_STAR} />
        </span>
      )}

      {isDiscounted && <span className="pos-card__happy-hour">Happy Hour</span>}

      <div className="pos-card__content">
        <h3 className="pos-card__name">{product.name}</h3>

        <div className="pos-card__body">
          {isDiscounted && (
            <p className="pos-card__price-original">{formatCurrency(product.price)}</p>
          )}

          <p className="pos-card__price">{formatCurrency(currentPrice)}</p>

          <div className="pos-card__actions">
            <button
              type="button"
              className="pos-quantity-button"
              aria-label="Diminuer la quantité"
              onClick={e => {
                e.stopPropagation();
                setQuantity(q => Math.max(1, q - 1));
              }}
            >
              <Glyph path={ICON_REMOVE} />
            </button>
            <input
              className="pos-quantity-input"
              type="number"
              min={1}
              max={999}
              value={quantity}
              aria-label={`Quantité pour ${product.name}`}
              onChange={handleQuantityChange}
              onClick={e => e.stopPropagation()}
              onFocus={e => e.currentTarget.select()}
            />
            <button
              type="button"
              className="pos-quantity-button"
              aria-label="Augmenter la quantité"
              onClick={e => {
                e.stopPropagation();
                setQuantity(q => Math.min(999, q + 1));
              }}
            >
              <Glyph path={ICON_ADD} />
            </button>
            <button type="button" className="pos-add-button" onClick={handleAdd}>
              Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProductGrid;
