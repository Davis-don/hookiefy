// src/pages/stories/components/OtherStories.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import LikeButton from '../../engagement/components/LikeButton';
import { listAllStories, type Story } from '../api/storiesApi';
import './otherStories.css';

const PAGE_SIZE = 10;

/* ── Cache tuning ─────────────────────────────────────── */
const STALE_TIME = 5 * 60_000;   // 5 min — fresh data
const GC_TIME = 30 * 60_000;     // 30 min — keep in memory

/* ============================================================
   SKELETON — story placeholder
   ============================================================
   Mirrors the shape of a real story card: the meta row (a
   small "author · category · date" cluster), the title, and
   a multi-line body block. Every block carries the shimmer
   wave so the whole column reads as "content on its way".
   ============================================================ */

function StorySkeleton({ withDivider }: { withDivider?: boolean }) {
  return (
    <div className="os-skeleton">
      {withDivider && <div className="os-skeleton__divider" />}

      {/* Meta row */}
      <div className="os-skeleton__meta">
        <span className="os-skeleton__line os-skeleton__line--author os-shimmer" />
        <span className="os-skeleton__dot" aria-hidden="true" />
        <span className="os-skeleton__pill os-shimmer" />
        <span className="os-skeleton__dot" aria-hidden="true" />
        <span className="os-skeleton__line os-skeleton__line--date os-shimmer" />
      </div>

      {/* Title */}
      <span className="os-skeleton__title os-shimmer" />

      {/* Body lines */}
      <div className="os-skeleton__body">
        <span className="os-skeleton__line os-shimmer" style={{ width: '96%' }} />
        <span className="os-skeleton__line os-shimmer" style={{ width: '100%' }} />
        <span className="os-skeleton__line os-shimmer" style={{ width: '88%' }} />
        <span className="os-skeleton__line os-shimmer" style={{ width: '74%' }} />
      </div>

      {/* Action row */}
      <div className="os-skeleton__actions">
        <span className="os-skeleton__chip os-shimmer" />
      </div>
    </div>
  );
}

function StorySkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="os-skeleton-list" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <StorySkeleton key={i} withDivider={i > 0} />
      ))}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

function OtherStories() {
  const access = useAuthStore((s) => s.access);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['all-stories', access],
    queryFn: ({ pageParam = 1 }) =>
      listAllStories({ page: pageParam }),
    enabled: !!access,

    /* ── Caching ──────────────────────────────────────── */
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,

    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.next != null ? lastPage.next : undefined,

    placeholderData: (prev) => prev,
  });

  /* Flatten every page into one array */
  const allStories: Story[] = useMemo(
    () => data?.pages.flatMap((p) => p.results) ?? [],
    [data],
  );

  /* Exclude the current user's own stories */
  const stories = useMemo<Story[]>(
    () => allStories.filter((s) => s.user !== currentUserId),
    [allStories, currentUserId],
  );

  /* ── Infinite scroll: observe the sentinel ─────────── */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  /* ── Loading (first page): skeleton list ──────────── */
  if (isLoading) {
    return <StorySkeletonList count={4} />;
  }

  /* ── Error ────────────────────────────────────────── */
  if (isError) {
    return (
      <div className="os-state os-state-error">
        {(error as Error)?.message || 'Could not load stories.'}
      </div>
    );
  }

  /* ── Empty ────────────────────────────────────────── */
  if (stories.length === 0) {
    return (
      <div className="os-empty">
        <div className="os-empty-icon" aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z" />
            <path d="M8 8h8" />
            <path d="M8 12h6" />
          </svg>
        </div>
        <p className="os-empty-title">Nothing here yet</p>
        <p className="os-empty-sub">
          When other people share their stories, they'll appear here.
        </p>
      </div>
    );
  }

  /* ── Feed ────────────────────────────────────────── */
  return (
    <div className="os-feed">
      <div className="os-feed-loaded">
        {stories.map((story, index) => {
          const isExpanded = expandedId === story.id;

          return (
            <div key={story.id}>
              {index > 0 && <div className="os-divider" />}

              <article className="os-post">
                {/* ── Meta: author · category · date ───── */}
                <div className="os-post-meta">
                  <span className="os-post-author">
                    {story.author_full_name ||
                      story.author_email ||
                      'Anonymous'}
                  </span>
                  <span className="os-post-dot" aria-hidden="true">
                    ·
                  </span>
                  <span className="os-post-category">
                    {story.category_display}
                  </span>
                  <span className="os-post-dot" aria-hidden="true">
                    ·
                  </span>
                  <time className="os-post-date" dateTime={story.created_at}>
                    {new Date(story.created_at).toLocaleDateString(
                      undefined,
                      { day: 'numeric', month: 'long', year: 'numeric' },
                    )}
                  </time>
                </div>

                {/* ── Title ──────────────────────────────── */}
                <h2 className="os-post-title">{story.title}</h2>

                {/* ── Body ───────────────────────────────── */}
                <div
                  className={
                    'os-post-body' + (isExpanded ? ' is-expanded' : '')
                  }
                  dangerouslySetInnerHTML={{ __html: story.content_html }}
                />

                {/* ── Actions: like only ─────────────────── */}
                <div className="os-post-actions">
                  <LikeButton targetKind="story" targetId={story.id} />
                </div>

                {/* ── Read more / less ───────────────────── */}
                <div className="os-post-footer">
                  <button
                    type="button"
                    className="os-post-more"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : story.id)
                    }
                  >
                    {isExpanded ? 'Show less' : 'Continue reading'}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{
                        transform: isExpanded
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      {/* ── Infinite-scroll sentinel ────────────────── */}
      <div ref={sentinelRef} />

      {/* ── Loading more: skeleton items ────────────── */}
      {isFetchingNextPage && (
        <div className="os-fetching-more">
          <StorySkeletonList count={2} />
        </div>
      )}

      {/* ── End-of-feed marker ──────────────────────── */}
      {!hasNextPage && stories.length >= PAGE_SIZE && (
        <div className="os-end" aria-hidden="true">
          You're all caught up
        </div>
      )}
    </div>
  );
}

export default OtherStories;