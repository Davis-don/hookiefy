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

  // ── Detail view replaces everything ────────────────────
  if (selectedId !== null) {
    return (
      <Currentbusiness
        businessId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  const heading = <h2 className="ab-heading">My Businesses</h2>;

  // ── Loading ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="ab-shell">
        {heading}
        <div className="ab-state">
          <Spinner size={20} color="#2563EB" label="Loading your businesses…" />
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────
  if (isError) {
    return (
      <div className="ab-shell">
        {heading}
        <div className="ab-state ab-state-error">
          {(error as Error)?.message || 'Something went wrong.'}
        </div>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="ab-shell">
        {heading}
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
      </div>
    );
  }

  // ── Table ─────────────────────────────────────────────
  return (
    <div className="ab-shell">
      {heading}

      <div className="ab-table-scroll">
        <table className="ab-table">
          <thead>
            <tr>
              <th className="ab-col-name">Business name</th>
              <th className="ab-col-cat">Category</th>
              <th className="ab-col-type">Type</th>
              <th className="ab-col-status">Status</th>
              <th className="ab-col-go" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {items.map((b: Business) => {
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

                  <td className="ab-cell ab-cell-go">
                    <span className="ab-go-hint">Manage</span>
                    <span className="ab-go-arrow" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.4"
                        strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 6 15 12 9 18" />
                      </svg>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Allbusinesses;