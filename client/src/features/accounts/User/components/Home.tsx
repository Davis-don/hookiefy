// src/pages/Home.tsx

import { useState } from 'react';
import { useBusinessFeed } from '../hooks/useBusinessFeed';
import { useAuthStore } from '../../../../store/authStore';
import { Spinner } from '../../../../components/spinner/Spinner';
import BusinessDetails from '../../../businesses/components/BusinessDetails';
import PostCard from './feed/PostCard';
import ProductCard from './feed/ProductCard';
import './home.css';

function Home() {
  const access = useAuthStore((s) => s.access);
  const [limit] = useState(20);
  const [activeBusinessId, setActiveBusinessId] = useState<number | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useBusinessFeed({ limit, kind: 'all' });

  // ── Business details takes over the entire Home view ──
  if (activeBusinessId !== null) {
    return (
      <BusinessDetails
        businessId={activeBusinessId}
        onBack={() => setActiveBusinessId(null)}
      />
    );
  }

  if (!access) {
    return (
      <div className="home-state home-state-empty">
        <p className="home-empty-title">Sign in to see your feed</p>
        <p className="home-empty-sub">
          Posts and products from other businesses will appear here.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="home-state">
        <Spinner size={22} color="#2563EB" label="Loading feed…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="home-state home-state-error">
        <p>{(error as Error)?.message || 'Could not load the feed.'}</p>
        <button
          type="button"
          className="home-retry-btn"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? 'Retrying…' : 'Try again'}
        </button>
      </div>
    );
  }

  const items = data?.results ?? [];

  if (items.length === 0) {
    return (
      <div className="home-state home-state-empty">
        <p className="home-empty-title">Nothing to show yet</p>
        <p className="home-empty-sub">
          When other businesses publish posts or products, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="home-shell">
      <ul className="home-list">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="home-list-item">
            {item.kind === 'post' ? (
              <PostCard
                item={item}
                onOpenBusiness={setActiveBusinessId}
              />
            ) : (
              <ProductCard
                item={item}
                onOpenBusiness={setActiveBusinessId}
              />
            )}
          </li>
        ))}
      </ul>

      {data?.has_more && (
        <button
          type="button"
          className="home-loadmore"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}

export default Home;