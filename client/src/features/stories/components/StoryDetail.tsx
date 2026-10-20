// src/features/stories/components/StoryDetail.tsx

import { useQuery } from '@tanstack/react-query';
import { Spinner } from '../../../components/spinner/Spinner';
import LikeButton from '../../engagement/components/LikeButton';
import { useAuthStore } from '../../../store/authStore';
import './storydetail.css';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ── Types — flat, matching StorySerializer ─────────── */

export type StoryDetailData = {
  id: number;
  user: number;
  author_email: string;
  author_full_name: string;
  title: string;
  content: string;
  content_html: string;
  content_text: string;
  summary: string;
  category: string;
  category_display: string;
  created_at: string;
  updated_at: string;
};

async function fetchStory(id: number): Promise<StoryDetailData> {
  const access = useAuthStore.getState().access;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (access) headers.Authorization = `Bearer ${access}`;

  const res = await fetch(`${API_BASE}/stories/${id}/`, { headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(
      (data && (data.detail || data.message)) || 'Failed to load story.',
    );
  }
  return data as StoryDetailData;
}

/* ── Component ──────────────────────────────────────── */

type StoryDetailProps = {
  storyId: number;
  onBack: () => void;
};

function StoryDetailPage({ storyId, onBack }: StoryDetailProps) {
  const { data, isLoading, isError, error } = useQuery<
    StoryDetailData,
    Error
  >({
    queryKey: ['story', storyId],
    queryFn: () => fetchStory(storyId),
    enabled: Number.isFinite(storyId) && storyId > 0,
    staleTime: 30_000,
  });

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

  const formattedDate = new Date(data.created_at).toLocaleDateString(
    undefined,
    { day: 'numeric', month: 'long', year: 'numeric' },
  );

  return (
    <article className="story-detail">
      {/* ── Top shell: back + meta ───────────────── */}
      <div className="story-detail__shell">
        <button
          type="button"
          className="story-detail-back"
          onClick={onBack}
          aria-label="Back to search"
        >
          ← Back
        </button>

        <div className="story-detail__meta">
          <span className="story-detail__author">{author}</span>
          <span className="story-detail__dot" aria-hidden="true">·</span>
          <span className="story-detail__category">
            {data.category_display || data.category}
          </span>
          <span className="story-detail__dot" aria-hidden="true">·</span>
          <time
            className="story-detail__date"
            dateTime={data.created_at}
          >
            {formattedDate}
          </time>
        </div>
      </div>

      {/* ── Title ────────────────────────────────── */}
      <div className="story-detail__shell">
        <h1 className="story-detail__title">{data.title}</h1>

        {data.summary && (
          <p className="story-detail__summary">{data.summary}</p>
        )}
      </div>

      {/* ── Body (bleached HTML) ─────────────────── */}
      <div className="story-detail__shell">
        <div
          className="story-detail__body"
          // backend bleached this HTML — safe to inject
          dangerouslySetInnerHTML={{ __html: data.content_html }}
        />
      </div>

      {/* ── Actions ──────────────────────────────── */}
      <div className="story-detail__shell">
        <div className="story-detail__actions">
          <LikeButton targetKind="story" targetId={data.id} />
        </div>
      </div>
    </article>
  );
}

export default StoryDetailPage;