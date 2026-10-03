import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { Spinner } from '../../../components/spinner/Spinner';
import { fetchPosts, type Post } from '../api/postsApi';
import './allposts.css';

type AllpostsProps = {
  businessId: number;
};

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

  return (
    <ul className="alp-list">
      {posts.map((p: Post) => (
        <li key={p.id} className="alp-item">
          {p.image_url && (
            <div className="alp-item-image">
              <img src={p.image_url} alt={p.title} loading="lazy" />
            </div>
          )}

          <div className="alp-item-body">
            <h4 className="alp-item-title">{p.title || 'Untitled post'}</h4>
            {p.body && <p className="alp-item-text">{p.body}</p>}
            <div className="alp-item-meta">
              <span>
                Posted {new Date(p.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default Allposts;