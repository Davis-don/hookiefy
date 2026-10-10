// src/features/systemStats/components/SystemUsers.tsx

import { useAuthStore } from '../../../../store/authStore';
import { Spinner } from '../../../../components/spinner/Spinner';
import { useSystemUsersCount } from '../hooks/useSystemStats';

import './systemStatCard.css';

function SystemUsers() {
  const access = useAuthStore((s) => s.access);
  const { data, isLoading, isError, error, isFetching } =
    useSystemUsersCount(!!access);

  const withBusiness = data?.with_business ?? 0;
  const withoutBusiness = data?.without_business ?? 0;

  const loading = isLoading || (isFetching && !data);

  return (
    <div className="stat-card">
      <div className="stat-glow" aria-hidden="true" />

      <header className="stat-head">
        <div className="stat-icon stat-icon-emerald" aria-hidden="true">
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>

        <div className="stat-head-text">
          <p className="stat-label">System Users</p>
          <p className="stat-sub">Accounts breakdown</p>
        </div>

        <span className="stat-live-dot" aria-hidden="true" />
      </header>

      <div className="stat-body">
        {loading && (
          <div className="stat-loading">
            <Spinner size={22} color="#10B981" label="Loading users…" />
          </div>
        )}

        {isError && (
          <p className="stat-error">
            {error instanceof Error
              ? error.message
              : 'Could not load users count.'}
          </p>
        )}

        {!loading && !isError && (
          <div className="stat-split-grid">
            <div className="stat-split-tile stat-split-tile-up">
              <span className="stat-split-tile-dot stat-split-dot-up" />
              <span className="stat-split-tile-value">
                {withBusiness.toLocaleString()}
              </span>
              <span className="stat-split-tile-label">With business</span>
            </div>

            <div className="stat-split-tile stat-split-tile-down">
              <span className="stat-split-tile-dot stat-split-dot-down" />
              <span className="stat-split-tile-value">
                {withoutBusiness.toLocaleString()}
              </span>
              <span className="stat-split-tile-label">Without business</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SystemUsers;