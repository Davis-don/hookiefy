// src/components/business/BusinessDetails.tsx

import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { Spinner } from '../../../components/spinner/Spinner';
import { fetchBusinessDetails } from '../api/businessDetailsApi';
import './businessdetails.css';

type BusinessDetailsProps = {
  businessId: number;
  onBack: () => void;
};

function formatPrice(price: string | null | undefined): string | null {
  if (price === null || price === undefined || price === '') return null;
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  return `KES ${n.toLocaleString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function BusinessDetails({ businessId, onBack }: BusinessDetailsProps) {
  const access = useAuthStore((s) => s.access);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['business-details', businessId, access],
    queryFn: () => fetchBusinessDetails(access, businessId),
    enabled: !!access && !!businessId,
    staleTime: 30_000,
  });

  const business = data?.business;

  /* ── Guard: if the owner has neither email nor phone, hide
        the whole Contact section so we don't render an empty
        card. ─────────────────────────────────────────── */
  const hasContact =
    !!business &&
    (!!business.owner_email ||
      !!business.owner_phone_number ||
      !!business.owner_full_name);

  return (
    <div className="business-details">
      {/* ── Top bar with back ──────────────────────── */}
      <div className="business-details__topbar">
        <button
          type="button"
          className="business-details__back"
          onClick={onBack}
          aria-label="Back"
          title="Back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Back</span>
        </button>
      </div>

      {/* ── Loading ────────────────────────────────── */}
      {isLoading && (
        <div className="business-details__state">
          <Spinner size={22} color="#2563EB" label="Loading business…" />
        </div>
      )}

      {/* ── Error ──────────────────────────────────── */}
      {isError && (
        <div className="business-details__state business-details__state--error">
          <p>
            {(error as Error)?.message ||
              'Could not load this business.'}
          </p>
          <button
            type="button"
            className="business-details__retry"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      )}

      {/* ── Content ────────────────────────────────── */}
      {business && (
        <div className="business-details__body">
          {/* Header — centered */}
          <header className="bd-header">
            <h1 className="bd-header__name">
              {business.business_name}
            </h1>

            <div className="bd-header__tags">
              <span
                className={`bd-tag bd-tag--${business.business_category}`}
              >
                {business.business_category_display}
              </span>
              <span
                className={`bd-tag bd-tag--status is-${business.status}`}
              >
                {business.status_display || business.status}
              </span>
            </div>

            {business.business_type && (
              <p className="bd-header__type">{business.business_type}</p>
            )}

            <p className="bd-header__location">
              {[business.city_town, business.region, business.county]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </header>

          {/* Description */}
          {business.description && (
            <section className="bd-section">
              <h2 className="bd-section__title">About</h2>
              <p className="bd-desc">{business.description}</p>
            </section>
          )}

          {/* Stats */}
          <div className="bd-stats">
            <div className="bd-stat">
              <span className="bd-stat__value">
                {business.post_count}
              </span>
              <span className="bd-stat__label">
                {business.post_count === 1 ? 'Post' : 'Posts'}
              </span>
            </div>
            <div className="bd-stat">
              <span className="bd-stat__value">
                {business.product_count}
              </span>
              <span className="bd-stat__label">
                {business.product_count === 1 ? 'Product' : 'Products'}
              </span>
            </div>
          </div>

          {/* ── Contact ──────────────────────────────── */}
          {hasContact && (
            <section className="bd-section">
              <h2 className="bd-section__title">Contact</h2>

              <ul className="bd-contact">
                {/* Owner name */}
                {business.owner_full_name && (
                  <li className="bd-contact__item">
                    <span
                      className="bd-contact__icon"
                      aria-hidden="true"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
                      </svg>
                    </span>
                    <div className="bd-contact__body">
                      <span className="bd-contact__label">Owner</span>
                      <span className="bd-contact__value">
                        {business.owner_full_name}
                      </span>
                    </div>
                  </li>
                )}

                {/* Email */}
                {business.owner_email && (
                  <li className="bd-contact__item">
                    <span
                      className="bd-contact__icon"
                      aria-hidden="true"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2.5" y="4.5" width="19" height="15" rx="1.5" />
                        <path d="M3 5l9 7 9-7" />
                      </svg>
                    </span>
                    <div className="bd-contact__body">
                      <span className="bd-contact__label">Email</span>
                      <a
                        className="bd-contact__value bd-contact__link"
                        href={`mailto:${business.owner_email}`}
                      >
                        {business.owner_email}
                      </a>
                    </div>
                  </li>
                )}

                {/* Phone */}
                {business.owner_phone_number && (
                  <li className="bd-contact__item">
                    <span
                      className="bd-contact__icon"
                      aria-hidden="true"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <div className="bd-contact__body">
                      <span className="bd-contact__label">Phone</span>
                      <a
                        className="bd-contact__value bd-contact__link"
                        href={`tel:${business.owner_phone_number}`}
                      >
                        {business.owner_phone_number}
                      </a>
                    </div>
                  </li>
                )}
              </ul>
            </section>
          )}

          {/* Products */}
          {business.products.length > 0 && (
            <section className="bd-section">
              <h2 className="bd-section__title">Products</h2>

              <ul className="bd-products">
                {business.products.map((product) => {
                  const priceLabel = formatPrice(product.price);
                  const cover =
                    product.primary_image?.image_url ??
                    product.images?.[0]?.image_url ??
                    null;

                  return (
                    <li className="bd-product" key={product.id}>
                      {cover && (
                        <div className="bd-product__image">
                          <img
                            src={cover}
                            alt={product.name}
                            loading="lazy"
                          />
                        </div>
                      )}

                      <div className="bd-product__meta">
                        <h3 className="bd-product__name">
                          {product.name}
                        </h3>

                        {priceLabel && (
                          <span className="bd-product__price">
                            {priceLabel}
                          </span>
                        )}

                        {product.description && (
                          <p className="bd-product__desc">
                            {product.description}
                          </p>
                        )}

                        {product.properties &&
                          product.properties.length > 0 && (
                            <ul className="bd-product__props">
                              {product.properties.map((p, i) => (
                                <li
                                  key={`${p.name}-${i}`}
                                  className="bd-product__prop"
                                >
                                  <span className="bd-product__prop-name">
                                    {p.name}
                                  </span>
                                  <span className="bd-product__prop-value">
                                    {p.value}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Posts */}
          {business.posts.length > 0 && (
            <section className="bd-section">
              <h2 className="bd-section__title">Posts</h2>

              <ul className="bd-posts">
                {business.posts.map((post) => (
                  <li className="bd-post" key={post.id}>
                    {post.image_url && (
                      <div className="bd-post__image">
                        <img
                          src={post.image_url}
                          alt={post.title}
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="bd-post__meta">
                      <h3 className="bd-post__title">
                        {post.title}
                      </h3>

                      {post.body && (
                        <p className="bd-post__body">{post.body}</p>
                      )}

                      <span className="bd-post__date">
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Empty */}
          {business.products.length === 0 &&
            business.posts.length === 0 && (
              <div className="bd-empty">
                <p className="bd-empty__title">
                  Nothing published yet
                </p>
                <p className="bd-empty__sub">
                  This business hasn't posted any products or posts.
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

export default BusinessDetails;