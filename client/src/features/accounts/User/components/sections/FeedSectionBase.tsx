// src/pages/Home/sections/FeedSectionBase.tsx

import { useEffect, useRef } from 'react';

import { Spinner } from '../../../../../components/spinner/Spinner';
import type { FeedItem } from '../../api/feedApi';

const SCROLL_TRIGGER_PX = 400;

/* ============================================================
   TYPES
   ============================================================ */

/**
 * The shape `useBusinessFeed` returns for `data`.
 *
 * Deliberately NOT `FeedResponse`. Once pagination has been
 * flattened by the hook there's no single `count` anymore —
 * the total is distributed across pages, and "count" would
 * mean page count, flattened count, or server total
 * depending on which layer it's read from. The three fields
 * below are all the section needs to render.
 */
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

  const items = data?.results ?? [];

  if (items.length === 0) {
    return (
      <div className="home-state home-state-empty">
        <p className="home-empty-title">{emptyTitle}</p>
        <p className="home-empty-sub">{emptySub}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="home-list">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="home-list-item">
            {renderItem(item)}
          </li>
        ))}
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