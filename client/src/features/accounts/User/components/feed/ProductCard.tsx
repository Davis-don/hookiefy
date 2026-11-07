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
  /** Optional slot rendered in the header, after the business name. */
  badge?: React.ReactNode;
};

const CLAMP_LINES = 2;

function formatPrice(price: string | null | undefined): string | null {
  if (price === null || price === undefined || price === '') return null;
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  return `KES ${n.toLocaleString()}`;
}

/**
 * Normalise a Kenyan number to the E.164 form wa.me expects.
 * Returns null if the value doesn't look like a valid
 * Kenyan mobile number.
 */
function normaliseKenyanPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;

  let local = digits;

  if (local.startsWith('254') && local.length > 9) {
    local = local.slice(3);
  }
  if (local.startsWith('0')) {
    local = local.slice(1);
  }

  if (local.length !== 9) return null;
  if (local[0] !== '7' && local[0] !== '1') return null;

  return `254${local}`;
}

/** Display form for the aria-label / title. */
function displayPhone(e164: string): string {
  if (e164.length !== 12) return e164;
  return `+${e164.slice(0, 3)} ${e164.slice(3, 6)} ${e164.slice(6, 9)} ${e164.slice(9)}`;
}

function buildWhatsAppUrl(
  e164: string,
  productId: number,
  productName?: string,
): string {
  const label = (productName ?? '').trim();
  const text = encodeURIComponent(
    label
      ? `Hi, I'm interested in "${label}" (product #${productId}) on Youpata.`
      : `Hi, I'm interested in product #${productId} on Youpata.`,
  );
  return `https://wa.me/${e164}?text=${text}`;
}

function ProductCard({
  item,
  onOpenBusiness,
  onOpenProduct,
  badge,
}: ProductCardProps) {
  const [expanded, setExpanded] = useState(false);

  /* ── Image loading state ────────────────────────── */
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const priceLabel = formatPrice(item.price);
  const description = item.description ?? '';
  const isLong = description.length > CLAMP_LINES * 60;
  const clampClass = !expanded && isLong ? ' is-clamped' : '';

  const soldOut = item.in_stock === false;

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

  const hasImage = !!item.image_url;
  const showSkeleton = hasImage && !imageLoaded && !imageError;

  /* ── Seller contact ──────────────────────────────────── */
  const sellerPhone = normaliseKenyanPhone(item.phone_number);
  const hasPhone = !!sellerPhone;
  const phoneDisplay = sellerPhone ? displayPhone(sellerPhone) : '';

  const whatsappUrl = sellerPhone
    ? buildWhatsAppUrl(sellerPhone, item.id, item.name)
    : '';
  const callUrl = sellerPhone ? `tel:+${sellerPhone}` : '';

  return (
    <article
      className={
        'product-card' + (soldOut ? ' is-sold-out' : '')
      }
    >
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

        {badge}

        <FollowButton
          businessId={item.business.id}
          businessName={item.business.business_name}
          onOpenBusiness={openBusiness}
        />
      </header>

      {hasImage && (
        <div
          className={
            'product-card__cover' +
            (showSkeleton ? ' is-loading' : '') +
            (imageError ? ' is-error' : '') +
            (soldOut ? ' is-sold-out' : '')
          }
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
          {/* ── Loading skeleton — a shimmering block with
                 a diagonal wave of light sweeping across.
                 No spinner, no ring, no text. The block
                 itself communicates "content coming". The
                 same base grey as the card body, with a
                 moving sheen so it doesn't look static. */}
          {showSkeleton && (
            <div
              className="product-card__cover-skeleton"
              aria-hidden="true"
            >
              <div className="product-card__cover-shimmer" />
            </div>
          )}

          {!imageError && (
            <img
              src={item.image_url ?? ''}
              alt={item.name ?? 'Product'}
              loading="lazy"
              className={
                'product-card__cover-img' +
                (imageLoaded ? ' is-loaded' : '')
              }
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}

          {imageError && (
            <div className="product-card__cover-error" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="M21 15l-5-5L5 21" />
                <line x1="3" y1="3" x2="21" y2="21" />
              </svg>
              <span>Image unavailable</span>
            </div>
          )}

          {soldOut && (
            <span
              className="product-card__sold-out"
              aria-label="Sold out"
            >
              Sold out
            </span>
          )}
        </div>
      )}

      <div className="product-card__body" {...gesture}>
        {item.name && <h3 className="product-card__name">{item.name}</h3>}

        {priceLabel && (
          <span
            className={
              'product-card__price' + (soldOut ? ' is-sold-out' : '')
            }
          >
            {priceLabel}
          </span>
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

      {hasPhone && (
        <div className="product-card__contact">
          <a
            className="product-card__contact-btn is-call"
            href={callUrl}
            data-product-id={item.id}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            title={`Call seller at ${phoneDisplay}`}
            aria-label={`Call seller at ${phoneDisplay} about ${item.name ?? 'this product'}`}
          >
            <svg
              className="product-card__contact-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z"
                fill="currentColor"
              />
            </svg>
            Call
          </a>

          <a
            className="product-card__contact-btn is-whatsapp"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-product-id={item.id}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            title={`Chat with seller on WhatsApp at ${phoneDisplay}`}
            aria-label={`Chat with seller on WhatsApp at ${phoneDisplay} about ${item.name ?? 'this product'}`}
          >
            <svg
              className="product-card__contact-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.26-8.24zm-3.6 4.1c-.17 0-.45.06-.68.31-.23.25-.9.88-.9 2.14s.92 2.48 1.05 2.65c.13.17 1.79 2.73 4.34 3.83.6.26 1.07.42 1.44.54.6.19 1.15.16 1.58.1.48-.07 1.48-.6 1.69-1.19.21-.59.21-1.09.15-1.19-.06-.1-.23-.16-.48-.28-.25-.13-1.48-.73-1.71-.81-.23-.09-.4-.13-.56.13-.17.25-.65.81-.8.98-.15.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.49-1.4-1.74-.15-.25-.02-.38.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.36-.77-1.86-.2-.48-.41-.42-.56-.42-.15 0-.31-.02-.48-.02z"
                fill="currentColor"
              />
            </svg>
            WhatsApp
          </a>
        </div>
      )}

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