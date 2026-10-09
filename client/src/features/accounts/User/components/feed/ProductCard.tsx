// src/components/feed/ProductCard.tsx

import { useState } from 'react';
import type { FeedItem } from '../../api/feedApi';
import LikeButton from '../engagement/LikeButton';
import FollowButton from '../engagement/FollowButton';
import './productcard.css';

type ProductCardProps = {
  item: FeedItem;
};

const CLAMP_LINES = 2;

function formatPrice(price: string | null | undefined): string | null {
  if (price === null || price === undefined || price === '') return null;
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  return `KES ${n.toLocaleString()}`;
}

function ProductCard({ item }: ProductCardProps) {
  const [expanded, setExpanded] = useState(false);

  const priceLabel = formatPrice(item.price);
  const description = item.description ?? '';
  const isLong = description.length > CLAMP_LINES * 60;
  const clampClass = !expanded && isLong ? ' is-clamped' : '';

  return (
    <article className="product-card">
      {/* ── 1. Header: avatar + business name ───────── */}
      <header className="product-card__header">
        <div className="product-card__avatar">
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
        </div>

        <span className="product-card__business">
          {item.business.business_name}
        </span>
      </header>

      {/* ── 2. Cover image ──────────────────────────── */}
      {item.image_url && (
        <div className="product-card__cover">
          <img
            src={item.image_url}
            alt={item.name ?? 'Product'}
            loading="lazy"
          />
        </div>
      )}

      {/* ── 3. Actions: like + follow ───────────────── */}
      <div className="product-card__actions">
        <LikeButton targetKind="product" targetId={item.id} />
        <FollowButton businessId={item.business.id} />
      </div>

      {/* ── 4. Body: name + price + clamped desc + props */}
      <div className="product-card__body">
        {item.name && (
          <h4 className="product-card__name">{item.name}</h4>
        )}

        {priceLabel && (
          <span className="product-card__price">{priceLabel}</span>
        )}

        {description && (
          <>
            <p className={`product-card__desc${clampClass}`}>
              {description}
            </p>

            {isLong && (
              <button
                type="button"
                className="product-card__toggle"
                onClick={() => setExpanded((v) => !v)}
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