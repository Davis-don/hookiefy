// src/pages/stories/components/OtherStories.tsx

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { Spinner } from '../../../components/spinner/Spinner';
import { listAllStories, type Story } from '../api/storiesApi';
import './otherStories.css';

function OtherStories() {
  const access = useAuthStore((s) => s.access);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [expandedId, setExpandedId] = useState<number | null>(null);

  const {
    data: allStories = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['all-stories', access],
    queryFn: () => listAllStories().then((r) => r.results),
    enabled: !!access,
    staleTime: 30_000,
  });

  // Exclude the current user's own stories — this tab is "Other Stories"
  const stories = useMemo<Story[]>(
    () => allStories.filter((s) => s.user !== currentUserId),
    [allStories, currentUserId]
  );

  /* ── Loading ──────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="os-state">
        <Spinner size={20} color="#2563EB" label="Loading stories…" />
      </div>
    );
  }

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
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            strokeLinejoin="round">
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
      {stories.map((story, index) => {
        const isExpanded = expandedId === story.id;

        return (
          <div key={story.id}>
            {index > 0 && <div className="os-divider" />}

            <article className="os-post">
              {/* ── Meta: author · category · date ───── */}
              <div className="os-post-meta">
                <span className="os-post-author">
                  {story.author_full_name || story.author_email || 'Anonymous'}
                </span>
                <span className="os-post-dot" aria-hidden="true">·</span>
                <span className="os-post-category">
                  {story.category_display}
                </span>
                <span className="os-post-dot" aria-hidden="true">·</span>
                <time
                  className="os-post-date"
                  dateTime={story.created_at}
                >
                  {new Date(story.created_at).toLocaleDateString(
                    undefined,
                    { day: 'numeric', month: 'long', year: 'numeric' }
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
                // backend bleached this HTML — safe to inject
                dangerouslySetInnerHTML={{ __html: story.content_html }}
              />

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
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
}

export default OtherStories;