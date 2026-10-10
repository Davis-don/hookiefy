// src/pages/feed/PostDetail.tsx

import { useQuery } from '@tanstack/react-query';
import { Spinner } from '../../../../../components/spinner/Spinner';
import LikeButton from '../../../../engagement/components/LikeButton';
import FollowButton from '../../../../engagement/components/FollowButton';
import { useAuthStore } from '../../../../../store/authStore';
import './postdetail.css';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ── Types — flat, matching PostSerializer ───────────── */

export type PostDetailData = {
  id: number;

  business: number;              // FK id
  business_name: string;
  business_category?: string;
  business_type?: string;

  owner: {
    id: number;
    full_name: string;
    profile_image_url: string | null;
  } | null;

  title: string | null;
  body: string;
  image_url: string | null;
  image_public_id: string | null;
  has_image: boolean;

  views: number;
  likes_count: number;
  follows_count: number;

  created_at: string;
  updated_at: string;
};

async function fetchPost(id: number): Promise<PostDetailData> {
  const access = useAuthStore.getState().access;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (access) headers.Authorization = `Bearer ${access}`;

  const res = await fetch(`${API_BASE}/posts/${id}/`, { headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(
      (data && (data.detail || data.message)) || 'Failed to load post.',
    );
  }
  return data as PostDetailData;
}

type PostDetailProps = {
  postId: number;
  onBack: () => void;
  onOpenBusiness: (businessId: number) => void;
};

function PostDetailPage({
  postId,
  onBack,
  onOpenBusiness,
}: PostDetailProps) {
  const { data, isLoading, isError, error } = useQuery<PostDetailData, Error>({
    queryKey: ['post', postId],
    queryFn: () => fetchPost(postId),
    enabled: Number.isFinite(postId) && postId > 0,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="post-detail-state">
        <Spinner size={22} color="#2563EB" label="Loading post…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="post-detail-state post-detail-state--error">
        <p>{(error as Error)?.message || 'Could not load this post.'}</p>
        <button type="button" className="post-detail-back" onClick={onBack}>
          ← Back
        </button>
      </div>
    );
  }

  const openBusiness = () => onOpenBusiness(data.business);

  return (
    <article className="post-detail">
      <button
        type="button"
        className="post-detail-back"
        onClick={onBack}
        aria-label="Back to feed"
      >
        ← Back
      </button>

      <header className="post-detail__header">
        <button
          type="button"
          className="post-detail__avatar"
          onClick={openBusiness}
          aria-label={`Open ${data.business_name}`}
        >
          {data.owner?.profile_image_url ? (
            <img
              src={data.owner.profile_image_url}
              alt={data.business_name}
            />
          ) : (
            <span className="post-detail__avatar-fallback">
              {(data.business_name || 'B').charAt(0).toUpperCase()}
            </span>
          )}
        </button>

        <button
          type="button"
          className="post-detail__business"
          onClick={openBusiness}
        >
          {data.business_name}
        </button>
      </header>

      {data.image_url && (
        <div className="post-detail__cover">
          <img src={data.image_url} alt={data.title ?? 'Post'} />
        </div>
      )}

      <div className="post-detail__actions">
        <LikeButton targetKind="post" targetId={data.id} />
        <FollowButton targetKind="post" targetId={data.id} />
      </div>

      <div className="post-detail__body">
        {data.title && <h1 className="post-detail__title">{data.title}</h1>}
        {data.body && <p className="post-detail__text">{data.body}</p>}
      </div>

      <footer className="post-detail__meta">
        <span>{data.views} views</span>
        <span>·</span>
        <span>{data.likes_count} likes</span>
        <span>·</span>
        <span>{data.follows_count} follows</span>
      </footer>
    </article>
  );
}

export default PostDetailPage;