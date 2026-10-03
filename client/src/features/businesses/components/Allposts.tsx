import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { Spinner } from '../../../components/spinner/Spinner';
import './allposts.css';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

type PostType = 'update' | 'offer' | 'announcement' | 'event';

type Post = {
  id: number;
  post_type: PostType;
  title: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

type AllpostsProps = {
  businessId: number;
};

async function fetchPosts(
  token: string | null,
  businessId: number
): Promise<Post[]> {
  if (!token) return [];

  const res = await fetch(`${API_BASE}/businesses/${businessId}/posts/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Could not load posts.');

  const data: any = await res.json();
  const list = Array.isArray(data) ? data : data.results ?? [];

  return list.map((row: any) => ({
    id: row.id,
    post_type: row.post_type ?? 'update',
    title: row.title ?? '',
    body: row.body ?? '',
    is_pinned: !!row.is_pinned,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

function Allposts({ businessId }: AllpostsProps) {
  const access = useAuthStore((s) => s.access);

  const {
    data: posts = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['business-posts', businessId, access],
    queryFn: () => fetchPosts(access, businessId),
    enabled: !!access && !!businessId,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="alp-state">
        <Spinner size={20} color="#2563EB" label="Loading posts…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="alp-state alp-state-error">
        {(error as Error)?.message || 'Could not load posts.'}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="alp-empty">
        <p className="alp-empty-title">No posts yet</p>
        <p className="alp-empty-sub">
          Your published posts will show up here.
        </p>
      </div>
    );
  }

  const typeIcon = (t: PostType) => {
    switch (t) {
      case 'offer':        return '🏷️';
      case 'announcement': return '📣';
      case 'event':        return '📅';
      default:             return '📝';
    }
  };

  const typeLabel = (t: PostType) => {
    switch (t) {
      case 'offer':        return 'Offer';
      case 'announcement': return 'Announcement';
      case 'event':        return 'Event';
      default:             return 'Update';
    }
  };

  return (
    <ul className="alp-list">
      {posts.map((p) => (
        <li key={p.id} className={'alp-item' + (p.is_pinned ? ' is-pinned' : '')}>
          <div className="alp-item-head">
            <span className={`alp-badge alp-badge-${p.post_type}`}>
              <span className="alp-badge-icon">{typeIcon(p.post_type)}</span>
              {typeLabel(p.post_type)}
            </span>

            {p.is_pinned && (
              <span className="alp-pinned" title="Pinned">
                📌 Pinned
              </span>
            )}
          </div>

          <h4 className="alp-item-title">{p.title || 'Untitled post'}</h4>
          <p className="alp-item-body">{p.body}</p>

          <div className="alp-item-meta">
            <span>Posted {new Date(p.created_at).toLocaleDateString()}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default Allposts;