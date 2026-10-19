// src/components/AllStories.jsx

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import {
  listMyStories,
  deleteStory,
  type Story,
} from '../api/storiesApi';
import ConfirmDeleteModal from '../../businesses/components/ConfirmDeleteModal';
import EditStory from './EditStory';
import './allStories.css';

const PAGE_SIZE = 10;

/* ── Cache tuning ─────────────────────────────────────── */
const STALE_TIME = 5 * 60_000;   // 5 min — fresh data
const GC_TIME = 30 * 60_000;     // 30 min — keep in memory

type AllStoriesProps = {
  onAdd?: () => void;
};

function MineStories({ onAdd }: AllStoriesProps) {
  const access = useAuthStore((s) => s.access);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Story | null>(null);
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
    queryKey: ['my-stories', access],
    queryFn: ({ pageParam = 1 }) =>
      listMyStories({ page: pageParam }),
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

  const stories: Story[] = useMemo(
    () => data?.pages.flatMap((p) => p.results) ?? [],
    [data],
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStory(id),
    onSuccess: (res) => {
      toast.success(res.message || 'Story deleted.');

      /* Invalidate BOTH caches so the Other Stories tab and
         Mine Stories tab pick up the change next time they mount. */
      queryClient.invalidateQueries({ queryKey: ['my-stories'] });
      queryClient.invalidateQueries({ queryKey: ['all-stories'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });

      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not delete this story.');
      setDeleteTarget(null);
    },
  });

  /* ── Loading ──────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="as-state">
        <Spinner size={20} color="#2563EB" label="Loading your stories…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="as-state as-state-error">
        {(error as Error)?.message || 'Could not load your stories.'}
      </div>
    );
  }

  /* ── Empty ────────────────────────────────────────── */

  if (stories.length === 0) {
    return (
      <div className="as-empty">
        <div className="as-empty-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z" />
            <path d="M8 8h8" />
            <path d="M8 12h6" />
          </svg>
        </div>
        <p className="as-empty-title">No stories yet</p>
        <p className="as-empty-sub">
          Share an experience that might inspire someone else.
        </p>
        {onAdd && (
          <button type="button" className="as-empty-btn" onClick={onAdd}>
            + Write your first story
          </button>
        )}
      </div>
    );
  }

  /* ── List ────────────────────────────────────────── */

  return (
    <div className="as-feed">
      {stories.map((story, index) => {
        const isEditing = editingId === story.id;
        const isExpanded = expandedId === story.id;

        return (
          <div key={story.id}>
            {/* Divider between stories (not before the first) */}
            {index > 0 && !isEditing && <div className="as-divider" />}

            {isEditing ? (
              <div className="as-editing-wrap">
                <EditStory
                  story={story}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => setEditingId(null)}
                />
              </div>
            ) : (
              <article className="as-post">
                {/* ── Meta row: category · date ──────── */}
                <div className="as-post-meta">
                  <span className="as-post-category">
                    {story.category_display}
                  </span>
                  <span className="as-post-dot" aria-hidden="true">·</span>
                  <time
                    className="as-post-date"
                    dateTime={story.created_at}
                  >
                    {new Date(story.created_at).toLocaleDateString(
                      undefined,
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </time>
                </div>

                {/* ── Title ──────────────────────────── */}
                <h2 className="as-post-title">{story.title}</h2>

                {/* ── Body ───────────────────────────── */}
                <div
                  className={
                    'as-post-body' + (isExpanded ? ' is-expanded' : '')
                  }
                  dangerouslySetInnerHTML={{ __html: story.content_html }}
                />

                {/* ── Footer: read more + actions ────── */}
                <div className="as-post-footer">
                  <button
                    type="button"
                    className="as-post-more"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : story.id)
                    }
                  >
                    {isExpanded ? 'Show less' : 'Continue reading'}
                    <svg width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.4"
                      strokeLinecap="round" strokeLinejoin="round"
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

                  <div className="as-post-actions">
                    <button
                      type="button"
                      className="as-icon-btn as-icon-btn-edit"
                      onClick={() => setEditingId(story.id)}
                      aria-label="Edit story"
                      title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        aria-hidden="true">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      className="as-icon-btn as-icon-btn-danger"
                      onClick={() => setDeleteTarget(story)}
                      aria-label="Delete story"
                      title="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            )}
          </div>
        );
      })}

      {/* ── Infinite-scroll sentinel ────────────────── */}
      <div ref={sentinelRef} />

      {/* ── Loading-more spinner ────────────────────── */}
      {isFetchingNextPage && (
        <div className="as-state" style={{ paddingTop: 12 }}>
          <Spinner
            size={20}
            color="#2563EB"
            label="Loading more stories…"
          />
        </div>
      )}

      {/* ── End-of-feed marker ──────────────────────── */}
      {!hasNextPage && stories.length >= PAGE_SIZE && (
        <div className="as-end" aria-hidden="true">
          You're all caught up
        </div>
      )}

      {/* ── Delete confirm modal ────────────────────── */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.title || 'this story'}"?`}
        message="This action cannot be undone. The story will be permanently removed."
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}

export default MineStories;