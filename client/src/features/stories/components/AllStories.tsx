import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { Spinner } from '../../../components/spinner/Spinner';
import './allStories.css';

type StoryItem = {
  id: number;
  kind: 'photo' | 'video' | 'text' | 'poll' | 'countdown' | 'live';
  title: string;
  caption?: string;
  expires_at?: string;
  views?: number;
};

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchStories(token: string | null): Promise<StoryItem[]> {
  if (!token) return [];

  const res = await fetch(`${API_BASE}/stories/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Could not load your stories.');

  const data = await res.json();
  const list = Array.isArray(data) ? data : data.results ?? [];

  return list.map((row: any) => ({
    id: row.id,
    kind: row.kind ?? 'photo',
    title: row.title ?? row.caption ?? 'Untitled story',
    caption: row.caption ?? '',
    expires_at: row.expires_at,
    views: row.views ?? 0,
  }));
}

type AllStoriesProps = {
  onAdd?: () => void;
};

function AllStories({ onAdd }: AllStoriesProps) {
  const access = useAuthStore((s) => s.access);

  const { data: items = [], isLoading, isError, error } = useQuery({
    queryKey: ['stories', access],
    queryFn: () => fetchStories(access),
    enabled: !!access,
    staleTime: 30_000,
  });

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
        {(error as Error)?.message || 'Something went wrong.'}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="as-empty">
        <p className="as-empty-title">No stories yet</p>
        <p className="as-empty-sub">
          Post a photo, video, or poll to engage your customers for 24 hours.
        </p>
        {onAdd && (
          <button type="button" className="as-empty-btn" onClick={onAdd}>
            + Create your first story
          </button>
        )}
      </div>
    );
  }

  return (
    <ul className="as-list">
      {items.map((item) => (
        <li key={item.id} className="as-item">
          <div className="as-item-main">
            <span className={`as-item-badge as-item-badge-${item.kind}`}>
              {item.kind}
            </span>
            <h4 className="as-item-title">{item.title}</h4>
            {item.caption && (
              <p className="as-item-desc">{item.caption}</p>
            )}
            <div className="as-item-meta">
              {typeof item.views === 'number' && (
                <span className="as-item-views">
                  {item.views} view{item.views === 1 ? '' : 's'}
                </span>
              )}
              {item.expires_at && (
                <span className="as-item-expires">
                  Expires {new Date(item.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="as-item-actions">
            <button type="button" className="as-item-btn as-item-btn-edit">
              Edit
            </button>
            <button type="button" className="as-item-btn as-item-btn-delete">
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default AllStories;