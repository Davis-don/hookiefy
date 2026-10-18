// src/pages/Home.tsx

import { useEffect, useRef, useState } from 'react';
import { useBusinessFeed } from '../hooks/useBusinessFeed';
import { useAuthStore } from '../../../../store/authStore';
import { Spinner } from '../../../../components/spinner/Spinner';
import BusinessDetails from '../../../businesses/components/BusinessDetails';
import PostCard from './feed/PostCard';
import ProductCard from './feed/ProductCard';
import PostDetail from './feed/PostDetail';
import ProductDetail from './feed/ProductDetail';
import './home.css';

type OpenView =
  | { kind: 'business'; id: number }
  | { kind: 'post'; id: number }
  | { kind: 'product'; id: number }
  | null;

/* Distance from bottom (px) at which we auto-load the next page. */
const SCROLL_TRIGGER_PX = 400;

function Home() {
  const access = useAuthStore((s) => s.access);
  const [openView, setOpenView] = useState<OpenView>(null);

  const {
    data,
    isLoading,
    isFetching,
    isFetchingMore,
    isError,
    error,
    refetch,
    loadMore,
  } = useBusinessFeed({ limit: 10, kind: 'all' });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  /* ── Auto-load on scroll ──────────────────────────
     Watches a sentinel div rendered below the list.
     When it enters the viewport (or comes within
     SCROLL_TRIGGER_PX of it), fires loadMore().
     loadMore() is idempotent — rapid scroll events
     cannot double-fire. */
  useEffect(() => {
    if (!data?.has_more) return;
    if (isFetchingMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            loadMore();
          }
        }
      },
      {
        rootMargin: `0px 0px ${SCROLL_TRIGGER_PX}px 0px`,
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [data?.has_more, isFetchingMore, loadMore]);

  /* ── Business details ──────────────────────────── */
  if (openView?.kind === 'business') {
    return (
      <BusinessDetails
        businessId={openView.id}
        onBack={() => setOpenView(null)}
      />
    );
  }

  /* ── Post detail ───────────────────────────────── */
  if (openView?.kind === 'post') {
    return (
      <PostDetail
        postId={openView.id}
        onBack={() => setOpenView(null)}
        onOpenBusiness={(businessId) =>
          setOpenView({ kind: 'business', id: businessId })
        }
      />
    );
  }

  /* ── Product detail ────────────────────────────── */
  if (openView?.kind === 'product') {
    return (
      <ProductDetail
        productId={openView.id}
        onBack={() => setOpenView(null)}
        onOpenBusiness={(businessId) =>
          setOpenView({ kind: 'business', id: businessId })
        }
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

  /* ── First load ────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="home-state">
        <Spinner size={22} color="#2563EB" label="Loading feed…" />
      </div>
    );
  }

  /* ── Error ─────────────────────────────────────── */
  if (isError && !data) {
    const retrying = isFetching && !isFetchingMore;

    return (
      <div className="home-state home-state-error">
        <p>{(error as Error)?.message || 'Could not load the feed.'}</p>
        <button
          type="button"
          className="home-retry-btn"
          onClick={() => refetch()}
          disabled={retrying}
        >
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      </div>
    );
  }

  const items = data?.results ?? [];

  /* ── Empty feed ────────────────────────────────── */
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

  /* ── Feed ──────────────────────────────────────── */
  return (
    <div className="home-shell">
      <ul className="home-list">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="home-list-item">
            {item.kind === 'post' ? (
              <PostCard
                item={item}
                onOpenBusiness={(businessId) =>
                  setOpenView({ kind: 'business', id: businessId })
                }
                onOpenPost={(postId) =>
                  setOpenView({ kind: 'post', id: postId })
                }
              />
            ) : (
              <ProductCard
                item={item}
                onOpenBusiness={(businessId) =>
                  setOpenView({ kind: 'business', id: businessId })
                }
                onOpenProduct={(productId) =>
                  setOpenView({ kind: 'product', id: productId })
                }
              />
            )}
          </li>
        ))}
      </ul>

      {/* Sentinel — when this scrolls near the viewport, loadMore fires */}
      <div ref={sentinelRef} className="home-sentinel" aria-hidden="true" />

      {/* Loading row while fetching the next page */}
      {isFetchingMore && (
        <div className="home-loading-row">
          <Spinner size={18} color="#64748B" label="Loading more…" />
        </div>
      )}

      {/* End-of-feed state */}
      {!data?.has_more && items.length > 0 && (
        <div className="home-end">
          <div className="home-end-icon" aria-hidden="true">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="home-end-title">You're all caught up</p>
          <p className="home-end-sub">
            You've seen every post and product from your feed.
          </p>
        </div>
      )}

      {/* Manual fallback — appears when has_more and no page is
          currently being fetched. Auto-scroll fires first in normal
          use; this button catches the rare case where the sentinel
          was missed (Safari quirks, programmatic jumps, etc.). */}
      {data?.has_more && !isFetchingMore && (
        <button
          type="button"
          className="home-loadmore"
          onClick={() => loadMore()}
        >
          Load more
        </button>
      )}
    </div>
  );
}

export default Home;