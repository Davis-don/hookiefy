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
import YoupataManagedPostCard from './YoupataManagedPostCard';
import YoupataManagedProductCard from './YoupataManagedProductCard';
import './home.css';

type HomeProps = {
  /** Fires when a card's "Purchase now" or the detail's purchase bar
   *  is pressed. The parent swaps to the payment view. */
  onOpenPayment: (productId: number) => void;
};

type OpenView =
  | { kind: 'business'; id: number }
  | { kind: 'post'; id: number }
  | { kind: 'product'; id: number; youpata?: boolean }
  | null;

const SCROLL_TRIGGER_PX = 400;

function Home({ onOpenPayment }: HomeProps) {
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
        isYoupataManaged={openView.youpata}
        onPurchase={(id) => onOpenPayment(id)}
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

  if (isLoading) {
    return (
      <div className="home-state">
        <Spinner size={22} color="#2563EB" label="Loading feed…" />
      </div>
    );
  }

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
        {items.map((item) => {
          const youpata = item.is_youpata_managed;

          return (
            <li key={`${item.kind}-${item.id}`} className="home-list-item">
              {item.kind === 'post' ? (
                youpata ? (
                  <YoupataManagedPostCard
                    item={item}
                    onOpenBusiness={(id) =>
                      setOpenView({ kind: 'business', id })
                    }
                    onOpenPost={(id) =>
                      setOpenView({ kind: 'post', id })
                    }
                  />
                ) : (
                  <PostCard
                    item={item}
                    onOpenBusiness={(id) =>
                      setOpenView({ kind: 'business', id })
                    }
                    onOpenPost={(id) =>
                      setOpenView({ kind: 'post', id })
                    }
                  />
                )
              ) : youpata ? (
                <YoupataManagedProductCard
                  item={item}
                  onOpenBusiness={(id) =>
                    setOpenView({ kind: 'business', id })
                  }
                  onOpenProduct={(id) =>
                    setOpenView({ kind: 'product', id, youpata: true })
                  }
                  onPurchase={(id) => onOpenPayment(id)}
                />
              ) : (
                <ProductCard
                  item={item}
                  onOpenBusiness={(id) =>
                    setOpenView({ kind: 'business', id })
                  }
                  onOpenProduct={(id) =>
                    setOpenView({ kind: 'product', id })
                  }
                />
              )}
            </li>
          );
        })}
      </ul>

      <div ref={sentinelRef} className="home-sentinel" aria-hidden="true" />

      {isFetchingMore && (
        <div className="home-loading-row">
          <Spinner size={18} color="#64748B" label="Loading more…" />
        </div>
      )}

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