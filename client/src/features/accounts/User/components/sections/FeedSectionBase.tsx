// src/pages/Home/sections/FeedSectionBase.tsx

import { useEffect, useRef } from 'react';

import type { FeedItem } from '../../api/feedApi';

const SCROLL_TRIGGER_PX = 400;

/* ============================================================
   TYPES
   ============================================================ */

export type FeedSectionData = {
  results: FeedItem[];
  has_more: boolean;
  next_cursor: string | null;
};

export type FeedSectionBaseProps = {
  data: FeedSectionData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingMore: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  loadMore: () => void;
  renderItem: (item: FeedItem) => React.ReactNode;
  emptyTitle: string;
  emptySub: string;
};

/* ============================================================
   SKELETON GRID
   ============================================================
   A grid of placeholder cards that mirror the real card
   layout: image block on top, text lines below, small
   footer row. Each placeholder is a solid grey block that
   carries the .sk-shimmer class — a diagonal light wave
   sweeps across it in a continuous loop.
   ============================================================ */

function SkeletonCard() {
  return (
    <div className="feed-skeleton-card" aria-hidden="true">
      {/* Cover image area */}
      <div className="feed-skeleton-card__cover sk-shimmer" />

      {/* Text block */}
      <div className="feed-skeleton-card__body">
        <div className="feed-skeleton-card__line sk-shimmer" style={{ width: '72%' }} />
        <div className="feed-skeleton-card__line sk-shimmer" style={{ width: '46%', height: '1.4rem' }} />
        <div className="feed-skeleton-card__line sk-shimmer" style={{ width: '92%' }} />
        <div className="feed-skeleton-card__line sk-shimmer" style={{ width: '84%' }} />
      </div>

      {/* Footer meta */}
      <div className="feed-skeleton-card__footer">
        <div className="feed-skeleton-card__chip sk-shimmer" />
        <div className="feed-skeleton-card__chip sk-shimmer" />
      </div>
    </div>
  );
}

function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="feed-skeleton-grid" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* ============================================================
   COMPONENT
   ============================================================ */

function FeedSectionBase({
  data,
  isLoading,
  isFetching,
  isFetchingMore,
  isError,
  error,
  refetch,
  loadMore,
  renderItem,
  emptyTitle,
  emptySub,
}: FeedSectionBaseProps) {
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

  /* ── First load: skeleton grid, no spinner ─────────── */
  if (isLoading) {
    return <SkeletonGrid count={6} />;
  }

  /* ── Error (only when we have nothing to show) ─────── */
  if (isError && !data) {
    const retrying = isFetching && !isFetchingMore;
    return (
      <div className="home-state home-state-error">
        <p>{error?.message || 'Could not load the feed.'}</p>
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

  /* ── Empty (loaded but nothing there) ──────────────── */
  const items = data?.results ?? [];

  if (items.length === 0) {
    return (
      <div className="home-state home-state-empty">
        <p className="home-empty-title">{emptyTitle}</p>
        <p className="home-empty-sub">{emptySub}</p>
      </div>
    );
  }

  /* ── Loaded grid ───────────────────────────────────── */
  return (
    <>
      <ul className="home-list feed-loaded-fade">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="home-list-item">
            {renderItem(item)}
          </li>
        ))}
      </ul>

      <div ref={sentinelRef} className="home-sentinel" aria-hidden="true" />

      {/*
        ── Loading more ──────────────────────────────
        When the user scrolls to the bottom and more
        pages are being fetched, render a few more
        skeleton cards below the loaded grid. Same
        shimmer wave as the initial load — no spinner,
        no blank space, no "Loading more…" text. The
        new cards cross-fade in when they arrive.
      */}
      {isFetchingMore && <SkeletonGrid count={3} />}

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
            You've seen every item in this feed.
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
    </>
  );
}

export default FeedSectionBase;