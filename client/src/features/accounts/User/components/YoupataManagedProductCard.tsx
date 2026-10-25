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
  return (
    <div className="youpata-product-card-wrap">
      <ProductCard
        {...cardProps}
        badge={<YoupataManagedBadge size="sm" />}
      />

      <div className="youpata-product-card-actions">
        <button
          type="button"
          className="youpata-product-card-purchase"
          onClick={() => onPurchase(cardProps.item.id)}
        >
          Purchase now
        </button>
      </div>
    </div>
  );
}

export default YoupataManagedProductCard;