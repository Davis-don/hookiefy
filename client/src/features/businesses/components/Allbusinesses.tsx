import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { Spinner } from '../../../components/spinner/Spinner';
import './allbusinesses.css';

type BusinessItem = {
  id: number;
  kind: 'service' | 'offer' | 'product' | 'location';
  title: string;
  description: string;
  status?: 'active' | 'draft' | 'paused';
  price?: number;
};

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchBusinesses(token: string | null): Promise<BusinessItem[]> {
  if (!token) return [];

  const res = await fetch(`${API_BASE}/services/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Could not load your businesses.');

  const data = await res.json();
  const list = Array.isArray(data) ? data : data.results ?? [];

  return list.map((row: any) => ({
    id: row.id,
    kind: row.kind ?? 'service',
    title: row.title ?? row.name ?? 'Untitled',
    description: row.description ?? '',
    status: row.status ?? 'active',
    price: row.price,
  }));
}

type AllbusinessesProps = {
  onAdd?: () => void;
};

function Allbusinesses({ onAdd }: AllbusinessesProps) {
  const access = useAuthStore((s) => s.access);

  const { data: items = [], isLoading, isError, error } = useQuery({
    queryKey: ['business-items', access],
    queryFn: () => fetchBusinesses(access),
    enabled: !!access,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="ab-state">
        <Spinner size={20} color="#2563EB" label="Loading your businesses…" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="ab-state ab-state-error">
        {(error as Error)?.message || 'Something went wrong.'}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="ab-empty">
        <p className="ab-empty-title">No businesses yet</p>
        <p className="ab-empty-sub">
          Add your first service, offer, or product so customers can find you.
        </p>
        {onAdd && (
          <button type="button" className="ab-empty-btn" onClick={onAdd}>
            + Add your first business
          </button>
        )}
      </div>
    );
  }

  return (
    <ul className="ab-list">
      {items.map((item) => (
        <li key={item.id} className="ab-item">
          <div className="ab-item-main">
            <span className={`ab-item-badge ab-item-badge-${item.kind}`}>
              {item.kind}
            </span>
            <h4 className="ab-item-title">{item.title}</h4>
            {item.description && (
              <p className="ab-item-desc">{item.description}</p>
            )}
            <div className="ab-item-meta">
              {item.status && (
                <span className={`ab-item-status is-${item.status}`}>
                  {item.status}
                </span>
              )}
              {typeof item.price === 'number' && (
                <span className="ab-item-price">
                  KES {item.price.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="ab-item-actions">
            <button type="button" className="ab-item-btn ab-item-btn-edit">
              Edit
            </button>
            <button type="button" className="ab-item-btn ab-item-btn-delete">
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default Allbusinesses;