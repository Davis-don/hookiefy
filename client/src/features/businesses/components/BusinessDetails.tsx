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