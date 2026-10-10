// src/components/feed/ProductCard.tsx

import { useState } from 'react';
import type { FeedItem } from '../../api/feedApi';
import LikeButton from '../../../../engagement/components/LikeButton';
import FollowButton from '../../../../engagement/components/FollowButton';
import './productcard.css';

type ProductCardProps = {
  item: FeedItem;
  onOpenBusiness: (businessId: number) => void;
};

const CLAMP_LINES = 2;

function formatPrice(price: string | null | undefined): string | null {
  if (price === null || price === undefined || price === '') return null;
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  return `KES ${n.toLocaleString()}`;
}

function ProductCard({ item, onOpenBusiness }: ProductCardProps) {
  const [expanded, setExpanded] = useState(false);

  const priceLabel = formatPrice(item.price);
  const description = item.description ?? '';
  const isLong = description.length > CLAMP_LINES * 60;
  const clampClass = !expanded && isLong ? ' is-clamped' : '';

  const openBusiness = () => onOpenBusiness(item.business.id);

  return (
    <article className="product-card">
      {/* ── 1. Header: avatar + business name ───────── */}
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

      {/* ── 2. Cover image ──────────────────────────── */}
      {item.image_url && (
        <button
          type="button"
          className="product-card__cover"
          onClick={openBusiness}
          aria-label={`Open ${item.business.business_name}`}
        >
          <img
            src={item.image_url}
            alt={item.name ?? 'Product'}
            loading="lazy"
          />
        </button>
      )}

      {/* ── 3. Actions: like + follow ───────────────── */}
      <div className="product-card__actions">
        <LikeButton targetKind="product" targetId={item.id} />
        <FollowButton targetKind="product" targetId={item.id} />
      </div>

      {/* ── 4. Body ─────────────────────────────────── */}
      <div className="product-card__body">
        {item.name && (
          <button
            type="button"
            className="product-card__name"
            onClick={openBusiness}
          >
            {item.name}
          </button>
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