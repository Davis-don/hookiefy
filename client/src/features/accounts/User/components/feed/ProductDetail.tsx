// src/pages/feed/ProductDetail.tsx

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spinner } from '../../../../../components/spinner/Spinner';
import LikeButton from '../../../../engagement/components/LikeButton';
import FollowButton from '../../../../engagement/components/FollowButton';
import { useAuthStore } from '../../../../../store/authStore';
import './productdetail.css';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ── Seller contact (mirrors YoupataManagedProductCard) ──
   Keep these two constants in sync with the card component.
   If you later move the number to the product / business
   record, replace both constants with
   `data.business_phone` (or wherever it lives). */

const SELLER_PHONE_E164 = '254758420860';        // for wa.me
const SELLER_PHONE_DISPLAY = '+254 758 420 860'; // for tel:

function buildWhatsAppUrl(
  productId: number | string,
  productName?: string,
): string {
  const label = (productName ?? '').trim();
  const text = encodeURIComponent(
    label
      ? `Hi, I'm interested in "${label}" (product #${productId}) on Youpata.`
      : `Hi, I'm interested in product #${productId} on Youpata.`,
  );
  return `https://wa.me/${SELLER_PHONE_E164}?text=${text}`;
}

function buildCallUrl(): string {
  return `tel:+${SELLER_PHONE_E164}`;
}

/* ── Types ───────────────────────────────────────────── */

export type ProductImage = {
  id: number;
  image_url: string;
  image_public_id: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
};

export type ProductProperty = {
  id: number;
  name: string;
  value: string;
  sort_order: number;
};

export type ProductDetailData = {
  id: number;

  business: number;
  business_name: string;
  business_category?: string;
  business_type?: string;

  owner: {
    id: number;
    full_name: string;
    profile_image_url: string | null;
  } | null;

  name: string;
  description: string;
  price: string | null;

  /** Units currently in stock. */
  quantity?: number;
  /** True when quantity > 0 — mirrors the model property. */
  in_stock?: boolean;

  images: ProductImage[];
  primary_image: ProductImage | null;
  properties: ProductProperty[];

  views: number;
  likes_count: number;
  follows_count: number;

  created_at: string;
  updated_at: string;

  /** True if this product is managed directly by Youpata. */
  is_youpata_managed?: boolean;
};

async function fetchProduct(id: number): Promise<ProductDetailData> {
  const access = useAuthStore.getState().access;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (access) headers.Authorization = `Bearer ${access}`;

  const res = await fetch(`${API_BASE}/products/${id}/`, { headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(
      (data && (data.detail || data.message)) || 'Failed to load product.',
    );
  }
  return data as ProductDetailData;
}

function formatPrice(price: string | null | undefined): string | null {
  if (price === null || price === undefined || price === '') return null;
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  return `KES ${n.toLocaleString()}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/* ============================================================
   COPYABLE PRODUCT ID — only rendered on Youpata-managed
   ============================================================ */

type ProductIdBlockProps = {
  productId: number;
};

function ProductIdBlock({ productId }: ProductIdBlockProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    setCopied(false);
    setCopyFailed(false);
  }, [productId]);

  useEffect(() => {
    if (!copied && !copyFailed) return;
    const t = window.setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, 1600);
    return () => window.clearTimeout(t);
  }, [copied, copyFailed]);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(String(productId));
    if (ok) {
      setCopied(true);
      setCopyFailed(false);
    } else {
      setCopied(false);
      setCopyFailed(true);
    }
  }, [productId]);

  return (
    <div className="product-detail__id-block">
      <div className="product-detail__id-text">
        <span className="product-detail__id-label">Product ID</span>
        <span className="product-detail__id-value">#{productId}</span>
      </div>

      <button
        type="button"
        className={
          'product-detail__id-copy' +
          (copied ? ' is-copied' : '') +
          (copyFailed ? ' is-error' : '')
        }
        onClick={handleCopy}
        aria-label={
          copied
            ? 'Product ID copied'
            : copyFailed
              ? 'Copy failed, try again'
              : 'Copy product ID to clipboard'
        }
      >
        {copied ? (
          <svg
            className="product-detail__id-copy-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <polyline
              points="20 6 9 17 4 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : copyFailed ? (
          <svg
            className="product-detail__id-copy-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <line
              x1="12" y1="8" x2="12" y2="13"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <circle cx="12" cy="17" r="1.3" fill="currentColor" />
          </svg>
        ) : (
          <svg
            className="product-detail__id-copy-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <rect
              x="9" y="9" width="11" height="11" rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M5 15V5a2 2 0 0 1 2-2h10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
        <span className="product-detail__id-copy-text">
          {copied ? 'Copied!' : copyFailed ? 'Try again' : 'Copy'}
        </span>
      </button>

      <p className="product-detail__id-hint">
        Share this ID with the seller or support to reference this product.
      </p>

      <span className="product-detail__id-sr" role="status" aria-live="polite">
        {copied ? 'Product ID copied to clipboard' : ''}
        {copyFailed ? 'Could not copy product ID' : ''}
      </span>
    </div>
  );
}

/* ============================================================
   LIGHTBOX
   ============================================================ */

type LightboxProps = {
  images: ProductImage[];
  index: number;
  open: boolean;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
  alt: string;
};

function Lightbox({
  images,
  index,
  open,
  onClose,
  onNavigate,
  alt,
}: LightboxProps) {
  const total = images.length;
  const hasMultiple = total > 1;

  const goPrev = useCallback(() => {
    if (!hasMultiple) return;
    onNavigate((index - 1 + total) % total);
  }, [hasMultiple, index, total, onNavigate]);

  const goNext = useCallback(() => {
    if (!hasMultiple) return;
    onNavigate((index + 1) % total);
  }, [hasMultiple, index, total, onNavigate]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };

    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, goPrev, goNext]);

  if (!open || total === 0) return null;

  const current = images[index];

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={onClose}
    >
      <button
        type="button"
        className="lightbox__close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div
        className="lightbox__stage"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          className="lightbox__image"
          src={current.image_url}
          alt={alt}
          draggable={false}
        />
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous image"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next image"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {hasMultiple && (
        <div className="lightbox__counter">
          {index + 1} / {total}
        </div>
      )}

      {hasMultiple && (
        <div
          className="lightbox__thumbs"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={`lightbox__thumb ${
                i === index ? 'is-active' : ''
              }`}
              onClick={() => onNavigate(i)}
              aria-label={`Show image ${i + 1}`}
            >
              <img src={img.image_url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PRODUCT DETAIL PAGE
   ============================================================ */

type ProductDetailProps = {
  productId: number;
  onBack: () => void;
  onOpenBusiness: (businessId: number) => void;
  /** True when this product is Youpata-managed — shows purchase bar + ID block. */
  isYoupataManaged?: boolean;
  /** Fires when the "Pay via M-Pesa" button is pressed. */
  onPurchase?: (productId: number) => void;
};

function ProductDetailPage({
  productId,
  onBack,
  onOpenBusiness,
  isYoupataManaged,
  onPurchase,
}: ProductDetailProps) {
  const { data, isLoading, isError, error } = useQuery<
    ProductDetailData,
    Error
  >({
    queryKey: ['product', productId],
    queryFn: () => fetchProduct(productId),
    enabled: Number.isFinite(productId) && productId > 0,
    staleTime: 30_000,
  });

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setLightboxIndex(null);
  }, [productId]);

  if (isLoading) {
    return (
      <div className="product-detail-state">
        <Spinner size={22} color="#2563EB" label="Loading product…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="product-detail-state product-detail-state--error">
        <p>{(error as Error)?.message || 'Could not load this product.'}</p>
        <button
          type="button"
          className="product-detail-back"
          onClick={onBack}
        >
          ← Back
        </button>
      </div>
    );
  }

  const priceLabel = formatPrice(data.price);

  const soldOut = data.in_stock === false;

  const galleryImages: ProductImage[] = [];
  const seen = new Set<number>();

  if (data.primary_image) {
    galleryImages.push(data.primary_image);
    seen.add(data.primary_image.id);
  }

  const orderedRest = [...data.images].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  for (const img of orderedRest) {
    if (!seen.has(img.id)) {
      galleryImages.push(img);
      seen.add(img.id);
    }
  }

  const primary = galleryImages[0] ?? null;

  const openBusiness = () => onOpenBusiness(data.business);

  const openLightbox = (imageId: number) => {
    const idx = galleryImages.findIndex((img) => img.id === imageId);
    setLightboxIndex(idx >= 0 ? idx : 0);
  };

  /*
   * Everything Youpata-managed lives inside this one flag:
   *   • the "Pay via M-Pesa" button
   *   • the Call / WhatsApp seller row
   *   • the copyable "Product ID" block
   *
   * For a normal (non-managed) product, the detail page
   * shows just the images, name, price, description,
   * properties, gallery, and stats — the same shape any
   * other marketplace listing would have.
   */
  const youpataManaged =
    isYoupataManaged ?? data.is_youpata_managed ?? false;

  const showPurchaseBar =
    youpataManaged && typeof onPurchase === 'function';

  // Contact links — only used when Youpata-managed, but
  // building them unconditionally is cheap and keeps the
  // JSX below flat.
  const whatsappUrl = buildWhatsAppUrl(data.id, data.name);
  const callUrl = buildCallUrl();

  return (
    <article
      className={
        'product-detail' + (soldOut ? ' is-sold-out' : '')
      }
    >
      <button
        type="button"
        className="product-detail-back"
        onClick={onBack}
        aria-label="Back to feed"
      >
        ← Back
      </button>

      <header className="product-detail__header">
        <button
          type="button"
          className="product-detail__avatar"
          onClick={openBusiness}
          aria-label={`Open ${data.business_name}`}
        >
          {data.owner?.profile_image_url ? (
            <img
              src={data.owner.profile_image_url}
              alt={data.business_name}
            />
          ) : (
            <span className="product-detail__avatar-fallback">
              {(data.business_name || 'B').charAt(0).toUpperCase()}
            </span>
          )}
        </button>

        <button
          type="button"
          className="product-detail__business"
          onClick={openBusiness}
        >
          {data.business_name}
        </button>
      </header>

      {primary && (
        <button
          type="button"
          className="product-detail__cover product-detail__cover--button"
          onClick={() => openLightbox(primary.id)}
          aria-label="Open image"
        >
          <img src={primary.image_url} alt={data.name} />

          {soldOut && (
            <span
              className="product-detail__sold-out"
              aria-label="Sold out"
            >
              Sold out
            </span>
          )}
        </button>
      )}

      <div className="product-detail__actions">
        <LikeButton targetKind="product" targetId={data.id} />
        <FollowButton
          businessId={data.business}
          businessName={data.business_name}
        />
      </div>

      <div className="product-detail__body">
        <h1 className="product-detail__name">{data.name}</h1>

        {/* ── Copyable product ID — Youpata-managed only ── */}
        {youpataManaged && <ProductIdBlock productId={data.id} />}

        {priceLabel && (
          <span
            className={
              'product-detail__price' +
              (soldOut ? ' is-sold-out' : '')
            }
          >
            {priceLabel}
          </span>
        )}

        {data.description && (
          <p className="product-detail__desc">{data.description}</p>
        )}

        {data.properties.length > 0 && (
          <ul className="product-detail__props">
            {data.properties.map((p) => (
              <li key={p.id} className="product-detail__prop">
                <span className="product-detail__prop-name">{p.name}</span>
                <span className="product-detail__prop-value">{p.value}</span>
              </li>
            ))}
          </ul>
        )}

        {galleryImages.length > 1 && (
          <div className="product-detail__gallery">
            {galleryImages.map((img) => (
              <button
                key={img.id}
                type="button"
                className="product-detail__gallery-item"
                onClick={() => openLightbox(img.id)}
                aria-label="Open image"
              >
                <img src={img.image_url} alt={data.name} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="product-detail__stats">
        <span>{data.likes_count} likes</span>
        <span>·</span>
        <span>{data.follows_count} follows</span>
      </div>

      {/* ── Purchase + seller contact (Youpata-managed only) ──
          Same gate as the ID block above — if the product
          isn't managed, none of these controls render. */}
      {showPurchaseBar && (
        <div className="product-detail__purchase">
          {soldOut ? (
            <button
              type="button"
              className="product-detail__purchase-btn is-sold-out"
              disabled
              aria-disabled="true"
              title="This product is currently out of stock"
            >
              Sold out
            </button>
          ) : (
            <button
              type="button"
              className="product-detail__purchase-btn"
              onClick={() => onPurchase?.(data.id)}
            >
              Pay via M-Pesa
            </button>
          )}

          <div className="product-detail__contact">
            <a
              className="product-detail__contact-btn is-call"
              href={callUrl}
              data-product-id={data.id}
              aria-label={`Call seller at ${SELLER_PHONE_DISPLAY} about product ${data.id}`}
            >
              <svg
                className="product-detail__contact-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.58 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .58 3.6 1 1 0 0 1-.25 1z"
                  fill="currentColor"
                />
              </svg>
              Call seller
            </a>

            <a
              className="product-detail__contact-btn is-whatsapp"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-product-id={data.id}
              aria-label={`Chat with seller on WhatsApp at ${SELLER_PHONE_DISPLAY} about product ${data.id}`}
            >
              <svg
                className="product-detail__contact-icon"
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
        </div>
      )}

      <Lightbox
        images={galleryImages}
        index={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(i) => setLightboxIndex(i)}
        alt={data.name}
      />
    </article>
  );
}

export default ProductDetailPage;