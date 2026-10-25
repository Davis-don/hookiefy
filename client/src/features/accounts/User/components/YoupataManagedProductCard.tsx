// src/components/feed/YoupataManagedProductCard.tsx

import ProductCard from './feed/ProductCard';
import YoupataManagedBadge from './YoupataManagedBadge';
import './youpataManagedProductCard.css';

type ProductCardProps = React.ComponentProps<typeof ProductCard> & {
  /** Called when the "Purchase now" button is pressed. */
  onPurchase: (productId: number) => void;
};

function YoupataManagedProductCard({
  onPurchase,
  ...cardProps
}: ProductCardProps) {
  // Sold out when the backend explicitly says in_stock is false.
  // Matches ProductCard's derivation so the card and the
  // purchase button can never disagree.
  const soldOut = cardProps.item.in_stock === false;

  return (
    <div className="youpata-product-card-wrap">
      <ProductCard
        {...cardProps}
        badge={<YoupataManagedBadge size="sm" />}
      />

      <div className="youpata-product-card-actions">
        {soldOut ? (
          <button
            type="button"
            className="youpata-product-card-purchase is-sold-out"
            disabled
            aria-disabled="true"
            title="This product is currently out of stock"
          >
            Sold out
          </button>
        ) : (
          <button
            type="button"
            className="youpata-product-card-purchase"
            onClick={() => onPurchase(cardProps.item.id)}
          >
            Purchase now
          </button>
        )}
      </div>
    </div>
  );
}

export default YoupataManagedProductCard;