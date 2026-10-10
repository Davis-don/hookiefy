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

  images: ProductImage[];
  primary_image: ProductImage | null;
  properties: ProductProperty[];

  views: number;
  likes_count: number;
  follows_count: number;

  created_at: string;
  updated_at: string;
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

/* ============================================================
   LIGHTBOX
   ============================================================
   A self-contained full-screen viewer. Renders nothing when
   `open` is false. Accepts a list of images and an index to
   display. Supports:
       - click outside to close
       - Escape to close
       - ArrowLeft / ArrowRight to navigate
       - left / right chevron buttons (when there are > 1 images)
       - thumbnail strip at the bottom (when > 1 image)
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

  /* ── Keyboard handling ────────────────────────────── */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };

    window.addEventListener('keydown', onKey);
    // Lock body scroll while open
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
      {/* Close button */}
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

      {/* Image — clicking the image itself does nothing,
          clicking outside (the backdrop) closes. */}
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

      {/* Prev / next */}
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

      {/* Counter */}
      {hasMultiple && (
        <div className="lightbox__counter">
          {index + 1} / {total}
        </div>
      )}

      {/* Thumbnail strip */}
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
};

function ProductDetailPage({
  productId,
  onBack,
  onOpenBusiness,
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

  /* ── Lightbox state ──────────────────────────────────
     `lightboxIndex` is null when closed, otherwise holds the
     index of the currently visible image inside the ordered
     images array. */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  /* ── Reset lightbox when the product changes ───────── */
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

  /* ── Build an ordered, deduplicated gallery list ─────
     Prefer the primary image first, then any remaining
     images ordered by sort_order. Dedupe by id so the
     primary doesn't appear twice. */
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

  return (
    <article className="product-detail">
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
        </button>
      )}

      <div className="product-detail__actions">
        <LikeButton targetKind="product" targetId={data.id} />
        <FollowButton targetKind="product" targetId={data.id} />
      </div>

      <div className="product-detail__body">
        <h1 className="product-detail__name">{data.name}</h1>

        {priceLabel && (
          <span className="product-detail__price">{priceLabel}</span>
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

      <footer className="product-detail__meta">
        <span>{data.views} views</span>
        <span>·</span>
        <span>{data.likes_count} likes</span>
        <span>·</span>
        <span>{data.follows_count} follows</span>
      </footer>

      {/* ── Lightbox overlay ─────────────────────────────── */}
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