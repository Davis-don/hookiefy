// src/features/search/components/SearchResults.tsx

import { useEffect, useRef } from 'react';

import { getScope, type SearchScope } from './SearchBar';
import { useSearch } from '../hooks/useSearch';
import { Spinner } from '../../../components/spinner/Spinner';
import type { SearchKind } from '../api/searchApi';
import './searchResults.css';

type SearchResultsProps = {
  query: string;
  scope: SearchScope;
  onClose: () => void;
  onOpenBusiness: (id: number) => void;
  onOpenPost: (id: number) => void;
  onOpenProduct: (id: number) => void;
  onOpenStory: (id: number) => void;
};

/* Distance from bottom (px) at which a section auto-loads. */
const SCROLL_TRIGGER_PX = 300;

/* ── Helpers ──────────────────────────────────────── */

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function Thumb({
  src,
  alt,
  fallback,
}: {
  src: string | null;
  alt: string;
  fallback: React.ReactNode;
}) {
  if (!src) {
    return <div className="sr-thumb sr-thumb-fallback">{fallback}</div>;
  }
  return (
    <div className="sr-thumb">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}

/* ── Per-section sentinel ─────────────────────────── */

function SectionSentinel({
  kind,
  hasMore,
  isFetchingMore,
  loadMore,
}: {
  kind: SearchKind;
  hasMore: boolean;
  isFetchingMore: boolean;
  loadMore: (kind: SearchKind) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || isFetchingMore) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) loadMore(kind);
        }
      },
      { rootMargin: `0px 0px ${SCROLL_TRIGGER_PX}px 0px`, threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, kind, loadMore]);

  return <div ref={ref} className="sr-sentinel" aria-hidden="true" />;
}

function SearchResults({
  query,
  scope,
  onClose,
  onOpenBusiness,
  onOpenPost,
  onOpenProduct,
  onOpenStory,
}: SearchResultsProps) {
  if (!query) return null;

  const scopeDef = getScope(scope);
  const search = useSearch(query, scope);

  const trimmed = query.trim();
  const tooShort = trimmed.length < 2;

  /* Typed accessors — no more `unknown` */
  const businesses = search.results('businesses');
  const posts = search.results('posts');
  const products = search.results('products');
  const stories = search.results('stories');
  const users = search.results('users');

  const totalFor = (kind: SearchKind) => search.counts(kind);
  const totalAll =
    totalFor('businesses') +
    totalFor('posts') +
    totalFor('products') +
    totalFor('stories') +
    totalFor('users');

  const allEmpty = totalAll === 0;

  return (
    <section className="sr-shell" aria-label={`Search results for ${query}`}>
      {/* ── Header ───────────────────────────────── */}
      <header className="sr-header">
        <p className="sr-heading">
          <span className="sr-heading-scope">
            {scopeDef.icon}
            <span>{scopeDef.label}</span>
          </span>
          <span className="sr-heading-sep" aria-hidden="true">·</span>
          <span className="sr-heading-text">
            Results for <strong>{query}</strong>
            {!search.isLoading && !tooShort && (
              <span className="sr-heading-count"> ({totalAll})</span>
            )}
          </span>
        </p>

        <div className="sr-header-right">
          {search.isFetching && !search.isLoading && (
            <Spinner size={14} color="#2563EB" label="Searching…" />
          )}
          <button
            type="button"
            className="sr-close"
            onClick={onClose}
            aria-label="Close search results"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────── */}
      <div className="sr-body">
        {tooShort && (
          <div className="sr-empty">
            <p className="sr-empty-title">Keep typing…</p>
            <p className="sr-empty-sub">
              Enter at least 2 characters to search.
            </p>
          </div>
        )}

        {!tooShort && search.isLoading && (
          <div className="sr-loading">
            <Spinner size={22} color="#2563EB" label="Searching…" />
          </div>
        )}

        {!tooShort && search.isError && (
          <div className="sr-error">
            <p className="sr-error-title">Search failed</p>
            <p className="sr-error-sub">
              {search.error?.message || 'Please try again.'}
            </p>
          </div>
        )}

        {!tooShort && !search.isLoading && !search.isError && allEmpty && (
          <div className="sr-empty">
            <div className="sr-empty-icon" aria-hidden="true">
              {scopeDef.icon}
            </div>
            <p className="sr-empty-title">
              No {scopeDef.label.toLowerCase()} found
            </p>
            <p className="sr-empty-sub">
              Try a different keyword or switch the scope.
            </p>
          </div>
        )}

        {!tooShort && !search.isLoading && !search.isError && !allEmpty && (
          <div className="sr-groups">
            {/* ── Businesses ─────────────────────── */}
            {businesses.length > 0 && (
              <section className="sr-group">
                <h3 className="sr-group-title">
                  Businesses
                  <span className="sr-group-count">
                    {totalFor('businesses')}
                  </span>
                </h3>
                <ul className="sr-group-list">
                  {businesses.map((b) => (
                    <li key={`business-${b.id}`}>
                      <button
                        type="button"
                        className="sr-card"
                        onClick={() => onOpenBusiness(b.id)}
                      >
                        <div className="sr-card-inner">
                          <Thumb
                            src={null}
                            alt={b.business_name}
                            fallback={
                              <span className="sr-thumb-text">
                                {initials(b.business_name) || '🏢'}
                              </span>
                            }
                          />
                          <div className="sr-card-body">
                            <p className="sr-card-title">
                              {b.business_name}
                            </p>
                            <p className="sr-card-meta">
                              {[
                                b.business_category,
                                b.city_town,
                                b.county,
                              ]
                                .filter(Boolean)
                                .join(' · ') || b.business_type}
                            </p>
                            {b.description && (
                              <p className="sr-card-text">
                                {b.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                <SectionSentinel
                  kind="businesses"
                  hasMore={search.hasMore('businesses')}
                  isFetchingMore={search.isFetchingMore('businesses')}
                  loadMore={search.loadMore}
                />

                {search.isFetchingMore('businesses') && (
                  <div className="sr-loading-row">
                    <Spinner size={16} color="#64748B" label="Loading more…" />
                  </div>
                )}
              </section>
            )}

            {/* ── Posts ───────────────────────────── */}
            {posts.length > 0 && (
              <section className="sr-group">
                <h3 className="sr-group-title">
                  Posts
                  <span className="sr-group-count">{totalFor('posts')}</span>
                </h3>
                <ul className="sr-group-list">
                  {posts.map((p) => (
                    <li key={`post-${p.id}`}>
                      <button
                        type="button"
                        className="sr-card"
                        onClick={() => onOpenPost(p.id)}
                      >
                        <div className="sr-card-inner">
                          <Thumb
                            src={p.image_url}
                            alt={p.title || 'Post'}
                            fallback={
                              <span className="sr-thumb-text">
                                {initials(p.title || 'P')}
                              </span>
                            }
                          />
                          <div className="sr-card-body">
                            <p className="sr-card-title">
                              {p.title || 'Untitled post'}
                            </p>
                            <p className="sr-card-meta">
                              {p.business_name}
                            </p>
                            {p.body && (
                              <p className="sr-card-text">{p.body}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                <SectionSentinel
                  kind="posts"
                  hasMore={search.hasMore('posts')}
                  isFetchingMore={search.isFetchingMore('posts')}
                  loadMore={search.loadMore}
                />

                {search.isFetchingMore('posts') && (
                  <div className="sr-loading-row">
                    <Spinner size={16} color="#64748B" label="Loading more…" />
                  </div>
                )}
              </section>
            )}

            {/* ── Products ────────────────────────── */}
            {products.length > 0 && (
              <section className="sr-group">
                <h3 className="sr-group-title">
                  Products
                  <span className="sr-group-count">
                    {totalFor('products')}
                  </span>
                </h3>
                <ul className="sr-group-list">
                  {products.map((p) => (
                    <li key={`product-${p.id}`}>
                      <button
                        type="button"
                        className="sr-card"
                        onClick={() => onOpenProduct(p.id)}
                      >
                        <div className="sr-card-inner">
                          <Thumb
                            src={p.image_url}
                            alt={p.name}
                            fallback={
                              <span className="sr-thumb-text">
                                {initials(p.name || 'Pr')}
                              </span>
                            }
                          />
                          <div className="sr-card-body">
                            <p className="sr-card-title">{p.name}</p>
                            <p className="sr-card-meta">
                              {p.business_name}
                              {p.price && (
                                <span className="sr-price">
                                  {' '}· {p.price}
                                </span>
                              )}
                            </p>
                            {p.description && (
                              <p className="sr-card-text">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                <SectionSentinel
                  kind="products"
                  hasMore={search.hasMore('products')}
                  isFetchingMore={search.isFetchingMore('products')}
                  loadMore={search.loadMore}
                />

                {search.isFetchingMore('products') && (
                  <div className="sr-loading-row">
                    <Spinner size={16} color="#64748B" label="Loading more…" />
                  </div>
                )}
              </section>
            )}

            {/* ── Stories ─────────────────────────── */}
            {stories.length > 0 && (
              <section className="sr-group">
                <h3 className="sr-group-title">
                  Stories
                  <span className="sr-group-count">
                    {totalFor('stories')}
                  </span>
                </h3>
                <ul className="sr-group-list">
                  {stories.map((s) => (
                    <li key={`story-${s.id}`}>
                      <button
                        type="button"
                        className="sr-card"
                        onClick={() => onOpenStory(s.id)}
                      >
                        <div className="sr-card-inner">
                          <Thumb
                            src={null}
                            alt={s.title}
                            fallback={
                              <span className="sr-thumb-text sr-thumb-story">
                                {s.category?.[0]?.toUpperCase() || '📖'}
                              </span>
                            }
                          />
                          <div className="sr-card-body">
                            <p className="sr-card-title">{s.title}</p>
                            <p className="sr-card-meta">
                              {s.author}
                              {s.category && (
                                <span className="sr-tag">{s.category}</span>
                              )}
                            </p>
                            {s.summary && (
                              <p className="sr-card-text">{s.summary}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                <SectionSentinel
                  kind="stories"
                  hasMore={search.hasMore('stories')}
                  isFetchingMore={search.isFetchingMore('stories')}
                  loadMore={search.loadMore}
                />

                {search.isFetchingMore('stories') && (
                  <div className="sr-loading-row">
                    <Spinner size={16} color="#64748B" label="Loading more…" />
                  </div>
                )}
              </section>
            )}

            {/* ── Users ───────────────────────────── */}
            {users.length > 0 && (
              <section className="sr-group">
                <h3 className="sr-group-title">
                  People
                  <span className="sr-group-count">{totalFor('users')}</span>
                </h3>
                <ul className="sr-group-list">
                  {users.map((u) => (
                    <li key={`user-${u.id}`}>
                      <div className="sr-card sr-card--static">
                        <div className="sr-card-inner">
                          <div className="sr-thumb sr-thumb-avatar">
                            <span className="sr-thumb-text">
                              {initials(u.full_name) || '👤'}
                            </span>
                          </div>
                          <div className="sr-card-body">
                            <p className="sr-card-title">{u.full_name}</p>
                            <p className="sr-card-meta">Member</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <SectionSentinel
                  kind="users"
                  hasMore={search.hasMore('users')}
                  isFetchingMore={search.isFetchingMore('users')}
                  loadMore={search.loadMore}
                />

                {search.isFetchingMore('users') && (
                  <div className="sr-loading-row">
                    <Spinner size={16} color="#64748B" label="Loading more…" />
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default SearchResults;