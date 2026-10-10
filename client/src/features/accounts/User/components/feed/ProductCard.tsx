// src/components/feed/ProductCard.tsx

import { useState } from 'react';
import type { FeedItem } from '../../api/feedApi';
import LikeButton from '../../../../engagement/components/LikeButton';
import FollowButton from '../../../../engagement/components/FollowButton';
import './productcard.css';

type ProductCardProps = {
  item: FeedItem;
  onOpenBusiness: (businessId: number) => void;
  onOpenProduct: (productId: number) => void;
};

const CLAMP_LINES = 2;

function formatPrice(price: string | null | undefined): string | null {
  if (price === null || price === undefined || price === '') return null;
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  return `KES ${n.toLocaleString()}`;
}

function ProductCard({
  item,
  onOpenBusiness,
  onOpenProduct,
}: ProductCardProps) {
  const [expanded, setExpanded] = useState(false);

  const priceLabel = formatPrice(item.price);
  const description = item.description ?? '';
  const isLong = description.length > CLAMP_LINES * 60;
  const clampClass = !expanded && isLong ? ' is-clamped' : '';

  // Header elements — open the business
  const openBusiness = () => onOpenBusiness(item.business.id);

  // Everything else — open the product
  const openProduct = () => onOpenProduct(item.id);

  return (
    <article className="product-card">
      {/* ── 1. Header: avatar + business name ─────────
              Both go to the business, not the product. */}
      <header className="product-card__header">
        <button
          type="button"
          className="product-card__avatar"
          onClick={openBusiness}
          aria-label={`Open ${item.business.business_name}`}
          title={item.business.business_name}
        >
          {item.owner?.profile_image_url ? (
            <img
              src={item.owner.profile_image_url}
              alt={item.business.business_name}
              loading="lazy"
            />
          ) : (
            <span className="product-card__avatar-fallback">
              {(item.business.business_name || 'B').charAt(0).toUpperCase()}
            </span>
          )}
        </button>

        <button
          type="button"
          className="product-card__business"
          onClick={openBusiness}
        >
          {item.business.business_name}
        </button>
      </header>

      {/* ── 2. Cover image — opens the PRODUCT ─────── */}
      {item.image_url && (
        <button
          type="button"
          className="product-card__cover"
          onClick={openProduct}
          aria-label={item.name ? `Open ${item.name}` : 'Open product'}
        >
          <img
            src={item.image_url}
            alt={item.name ?? 'Product'}
            loading="lazy"
          />
        </button>
      )}

      {/* ── 3. Actions: like + follow ─────────────────
              Separate buttons — never navigate. */}
      <div className="product-card__actions">
        <LikeButton targetKind="product" targetId={item.id} />
        <FollowButton targetKind="product" targetId={item.id} />
      </div>

      {/* ── 4. Body — everything here opens the PRODUCT ── */}
      <div className="product-card__body">
        {item.name && (
          <button
            type="button"
            className="product-card__name"
            onClick={openProduct}
          >
            {item.name}
          </button>
        )}

        {priceLabel && (
          <span
            className="product-card__price"
            onClick={openProduct}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openProduct();
            }}
          >
            {priceLabel}
          </span>
        )}

        {description && (
          <>
            <p
              className={`product-card__desc${clampClass}`}
              onClick={openProduct}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openProduct();
              }}
            >
              {description}
            </p>

            {isLong && (
              <button
                type="button"
                className="product-card__toggle"
                onClick={(e) => {
                  // Stop the click from bubbling into the description
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </>
        )}

        {item.properties && item.properties.length > 0 && (
          <ul className="product-card__props">
            {item.properties.map((p, i) => (
              <li key={`${p.name}-${i}`} className="product-card__prop">
                <span className="product-card__prop-name">{p.name}</span>
                <span className="product-card__prop-value">{p.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export default ProductCard;