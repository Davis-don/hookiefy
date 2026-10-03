import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { Spinner } from '../../../components/spinner/Spinner';
import { fetchMyBusinesses, type Business } from '../api/businessApi';
import Currentbusiness from './Currentbusiness';
import './allbusinesses.css';

type AllbusinessesProps = {
  onAdd?: () => void;
};

function Allbusinesses({ onAdd }: AllbusinessesProps) {
  const access = useAuthStore((s) => s.access);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const {
    data: items = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['business-items', access],
    queryFn: () => fetchMyBusinesses(access),
    enabled: !!access,
    staleTime: 30_000,
  });

  // ── Detail view replaces the table ─────────────────────
  if (selectedId !== null) {
    return (
      <Currentbusiness
        businessId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

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
          Add your first business so customers can find you.
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
    <div className="ab-table-scroll">
      <table className="ab-table">
        <thead>
          <tr>
            <th className="ab-col-name">Business name</th>
            <th className="ab-col-cat">Category</th>
            <th className="ab-col-type">Type</th>
            <th className="ab-col-status">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b: Business) => {
            // Normalise the status so the CSS class always matches,
            // regardless of case coming back from the API.
            const statusKey = String(b.status || 'active')
              .toLowerCase()
              .trim();

            return (
              <tr
                key={b.id}
                className="ab-row"
                onClick={() => setSelectedId(b.id)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedId(b.id);
                  }
                }}
              >
                <td className="ab-cell ab-cell-name">
                  {b.business_name || '—'}
                </td>

                <td className="ab-cell">
                  <span className={`ab-pill ab-pill-${b.business_category}`}>
                    {b.business_category_display}
                  </span>
                </td>

                <td className="ab-cell ab-cell-type">
                  {b.business_type || '—'}
                </td>

                <td className="ab-cell">
                  <span className={`ab-status ab-status-${statusKey}`}>
                    {b.status_display || b.status || 'Unknown'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default Allbusinesses;