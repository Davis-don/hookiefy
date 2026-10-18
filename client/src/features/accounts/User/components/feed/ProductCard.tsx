// src/components/feed/ProductCard.tsx

import { useRef, useState } from 'react';
import type { FeedItem } from '../../api/feedApi';
import FollowButton from '../../../../engagement/components/FollowButton';
import LikeCount from '../../../../engagement/components/LikeCount';
import FollowCount from '../../../../engagement/components/FollowCount';
import HeartBurst, {
  type HeartBurstHandle,
} from '../../../../engagement/components/HeartBurst';
import { useToggleLike } from '../../../../engagement/hooks/useEngagement';
import { useDoubleTap } from '../../../../engagement/hooks/useDoubleTap';
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

  const openBusiness = () => onOpenBusiness(item.business.id);
  const openProduct = () => onOpenProduct(item.id);

  const burstRef = useRef<HeartBurstHandle>(null);

  const likeMutation = useToggleLike('product', item.id, {
    onOptimistic: () => {},
    onConfirmed: () => {},
    onRollback: () => {},
  });

  const gesture = useDoubleTap({
    onSingle: openProduct,
    onDouble: (point) => {
      if (likeMutation.isPending) return;

      burstRef.current?.burst(point.x, point.y, false);

      likeMutation.mutate(undefined, {
        onSuccess: () => {
          burstRef.current?.burst(point.x, point.y, true);
        },
      });
    },
  });

  return (
    <article className="product-card">
      <HeartBurst ref={burstRef} />

      <header className="product-card__header">
        <button
          type="button"
          className="product-card__avatar"
          onClick={(e) => {
            e.stopPropagation();
            openBusiness();
          }}
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
          onClick={(e) => {
            e.stopPropagation();
            openBusiness();
          }}
        >
          {item.business.business_name}
        </button>

        <FollowButton
          businessId={item.business.id}
          businessName={item.business.business_name}
          onOpenBusiness={openBusiness}
        />
      </header>

      {item.image_url && (
        <div
          className="product-card__cover"
          role="button"
          tabIndex={0}
          aria-label={item.name ? `Open ${item.name}` : 'Open product'}
          {...gesture}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openProduct();
            }
          }}
        >
          <img
            src={item.image_url}
            alt={item.name ?? 'Product'}
            loading="lazy"
          />
        </div>
      )}

      <div className="product-card__body" {...gesture}>
        {item.name && <h3 className="product-card__name">{item.name}</h3>}

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
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
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

      <footer className="product-card__footer">
        <LikeCount
          targetKind="product"
          targetId={item.id}
          className="product-card__like-count"
        />
        <span className="product-card__footer-dot" aria-hidden="true">
          ·
        </span>
        <FollowCount
          businessId={item.business.id}
          className="product-card__follow-count"
        />
      </footer>
    </article>
  );
}

export default ProductCard;