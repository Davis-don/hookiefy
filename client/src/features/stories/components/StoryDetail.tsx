// src/features/stories/components/StoryDetail.tsx

import { Spinner } from '../../../components/spinner/Spinner';
import LikeButton from '../../engagement/components/LikeButton';
import { useStory } from '../hooks/useStory';
import './storydetail.css';

type StoryDetailProps = {
  storyId: number;
  onBack: () => void;
};

/* ── Category display fallback (in case category_display
      is missing on older rows) ──────────────────────── */
const CATEGORY_LABELS: Record<string, string> = {
  journey: 'Journeys',
  motivation: 'Motivation',
  success: 'Success Stories',
  experience: 'Experiences',
  lessons: 'Lessons',
  inspiration: 'Inspiration',
};

function StoryDetailPage({ storyId, onBack }: StoryDetailProps) {
  const { data, isLoading, isError, error } = useStory(storyId);

  if (isLoading) {
    return (
      <div className="story-detail-state">
        <Spinner size={22} color="#2563EB" label="Loading story…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="story-detail-state story-detail-state--error">
        <p>{(error as Error)?.message || 'Could not load this story.'}</p>
        <button type="button" className="story-detail-back" onClick={onBack}>
          ← Back
        </button>
      </div>
    );
  }

  const author =
    data.author_full_name || data.author_email || 'Anonymous';

  const categoryLabel =
    data.category_display ||
    CATEGORY_LABELS[data.category] ||
    data.category;

  const formattedDate = new Date(data.created_at).toLocaleDateString(
    undefined,
    { day: 'numeric', month: 'long', year: 'numeric' },
  );

  return (
    <article className="story-detail">
      {/* ── Top bar: back + author meta ─────────────── */}
      <div className="story-detail__shell">
        <button
          type="button"
          className="story-detail-back"
          onClick={onBack}
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <div className="story-detail__meta">
          <span className="story-detail__author">{author}</span>
          <span className="story-detail__dot" aria-hidden="true">·</span>
          <span className="story-detail__category">{categoryLabel}</span>
          <span className="story-detail__dot" aria-hidden="true">·</span>
          <time
            className="story-detail__date"
            dateTime={data.created_at}
          >
            {formattedDate}
          </time>
        </div>
      </div>

      {/* ── Title + summary ─────────────────────────── */}
      <header className="story-detail__header">
        <h1 className="story-detail__title">{data.title}</h1>

        {data.summary && (
          <p className="story-detail__summary">{data.summary}</p>
        )}
      </header>

      {/* ── Divider ─────────────────────────────────── */}
      <div className="story-detail__divider" aria-hidden="true" />

      {/* ── Body (bleached HTML from backend) ───────── */}
      <div className="story-detail__body-wrap">
        <div
          className="story-detail__body"
          dangerouslySetInnerHTML={{ __html: data.content_html }}
        />
      </div>

      {/* ── Footer: actions ─────────────────────────── */}
      <footer className="story-detail__footer">
        <div className="story-detail__actions">
          <LikeButton targetKind="story" targetId={data.id} />
        </div>
      </footer>
    </article>
  );
}

export default StoryDetailPage;