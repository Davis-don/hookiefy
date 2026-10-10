// src/features/systemStats/components/SystemBusinesses.tsx

import { useAuthStore } from '../../../../store/authStore'
import { Spinner } from '../../../../components/spinner/Spinner';
import { useSystemBusinessesCount } from '../hooks/useSystemStats';

import './systemStatCard.css';

function SystemBusinesses() {
  const access = useAuthStore((s) => s.access);
  const { data, isLoading, isError, error, isFetching } =
    useSystemBusinessesCount(!!access);

  const count = data?.count ?? 0;
  const loading = isLoading || (isFetching && !data);

  return (
    <div className="stat-card">
      <div className="stat-glow" aria-hidden="true" />

      <header className="stat-head">
        <div className="stat-icon stat-icon-violet" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M9 21v-6h6v6" />
            <path d="M9 11h.01M15 11h.01" />
          </svg>
        </div>

        <div className="stat-head-text">
          <p className="stat-label">System Businesses</p>
          <p className="stat-sub">Active business profiles</p>
        </div>

        <span className="stat-live-dot" aria-hidden="true" />
      </header>

      <div className="stat-body">
        {loading && (
          <div className="stat-loading">
            <Spinner size={22} color="#8B5CF6" label="Loading businesses…" />
          </div>
        )}

        {isError && (
          <p className="stat-error">
            {error instanceof Error
              ? error.message
              : 'Could not load businesses count.'}
          </p>
        )}

        {!loading && !isError && (
          <p className="stat-amount">
            <span className="stat-number">{count.toLocaleString()}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default SystemBusinesses;