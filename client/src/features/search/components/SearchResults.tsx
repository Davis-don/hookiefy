// src/features/search/components/SearchResults.tsx

import { getScope, type SearchScope } from './SearchBar';
import { useSearch } from '../hooks/useSearch';
import { Spinner } from '../../../components/spinner/Spinner';
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

const backendKind = (scope: SearchScope): SearchScope => scope;

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

  const { data, isLoading, isFetching, isError, error } = useSearch(
    query,
    backendKind(scope),
  );

  const results = data?.results;
  const counts = data?.counts;

  const total = counts
    ? Object.values(counts).reduce((a, b) => a + b, 0)
    : 0;

  const trimmed = query.trim();
  const tooShort = trimmed.length < 2;

  return (
    <section className="sr-shell" aria-label={`Search results for ${query}`}>
      <header className="sr-header">
        <p className="sr-heading">
          <span className="sr-heading-scope">
            {scopeDef.icon}
            <span>{scopeDef.label}</span>
          </span>
          <span className="sr-heading-sep" aria-hidden="true">·</span>
          <span className="sr-heading-text">
            Results for <strong>{query}</strong>
            {!isLoading && !tooShort && data && (
              <span className="sr-heading-count"> ({total})</span>
            )}
          </span>
        </p>

        <div className="sr-header-right">
          {isFetching && !isLoading && (
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

      <div className="sr-body">
        {tooShort && (
          <div className="sr-empty">
            <p className="sr-empty-title">Keep typing…</p>
            <p className="sr-empty-sub">Enter at least 2 characters to search.</p>
          </div>
        )}

        {!tooShort && isLoading && (
          <div className="sr-loading">
            <Spinner size={22} color="#2563EB" label="Searching…" />
          </div>
        )}

        {!tooShort && isError && (
          <div className="sr-error">
            <p className="sr-error-title">Search failed</p>
            <p className="sr-error-sub">
              {(error as Error)?.message || 'Please try again.'}
            </p>
          </div>
        )}

        {!tooShort && !isLoading && !isError && total === 0 && (
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

        {!tooShort && !isLoading && !isError && results && total > 0 && (
          <div className="sr-groups">
            {/* Businesses */}
            {results.businesses.length > 0 && (
              <section className="sr-group">
                <h3 className="sr-group-title">
                  Businesses
                  <span className="sr-group-count">{results.businesses.length}</span>
                </h3>
                <ul className="sr-group-list">
                  {results.businesses.map((b) => (
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
                            <p className="sr-card-title">{b.business_name}</p>
                            <p className="sr-card-meta">
                              {[b.business_category, b.city_town, b.county]
                                .filter(Boolean)
                                .join(' · ') || b.business_type}
                            </p>
                            {b.description && (
                              <p className="sr-card-text">{b.description}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Posts */}
            {results.posts.length > 0 && (
              <section className="sr-group">
                <h3 className="sr-group-title">
                  Posts
                  <span className="sr-group-count">{results.posts.length}</span>
                </h3>
                <ul className="sr-group-list">
                  {results.posts.map((p) => (
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
                            <p className="sr-card-meta">{p.business_name}</p>
                            {p.body && (
                              <p className="sr-card-text">{p.body}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Products */}
            {results.products.length > 0 && (
              <section className="sr-group">
                <h3 className="sr-group-title">
                  Products
                  <span className="sr-group-count">{results.products.length}</span>
                </h3>
                <ul className="sr-group-list">
                  {results.products.map((p) => (
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
                                <span className="sr-price"> · {p.price}</span>
                              )}
                            </p>
                            {p.description && (
                              <p className="sr-card-text">{p.description}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Stories */}
            {results.stories.length > 0 && (
              <section className="sr-group">
                <h3 className="sr-group-title">
                  Stories
                  <span className="sr-group-count">{results.stories.length}</span>
                </h3>
                <ul className="sr-group-list">
                  {results.stories.map((s) => (
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
              </section>
            )}

            {/* Users */}
            {results.users.length > 0 && (
              <section className="sr-group">
                <h3 className="sr-group-title">
                  People
                  <span className="sr-group-count">{results.users.length}</span>
                </h3>
                <ul className="sr-group-list">
                  {results.users.map((u) => (
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
              </section>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default SearchResults;