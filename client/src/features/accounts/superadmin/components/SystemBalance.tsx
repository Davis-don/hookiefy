// src/features/systemBalance/components/SystemBalance.tsx

import { useAuthStore } from '../../../../store/authStore';
import { Spinner } from '../../../../components/spinner/Spinner';
import { useSystemBalance } from '../hooks/useSystemBalance';

import './systemBalance.css';

type SystemBalanceProps = {
  /** Optional title override */
  title?: string;
};

function SystemBalance({ title = 'System Balance' }: SystemBalanceProps) {
  const access = useAuthStore((s) => s.access);

  const { data, isLoading, isError, error, isFetching } =
    useSystemBalance(!!access);

  const currency = data?.data?.currency ?? 'KES';
  const balance = data?.data?.balance ?? '0.00';

  const loading = isLoading || (isFetching && !data);

  return (
    <div className="sb-card">
      <div className="sb-glow" aria-hidden="true" />

      <header className="sb-head">
        <div className="sb-icon" aria-hidden="true">
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
            <rect x="2" y="6" width="20" height="14" rx="3" />
            <path d="M2 10h20" />
            <circle cx="17" cy="15" r="1.4" fill="currentColor" />
          </svg>
        </div>

        <div className="sb-head-text">
          <p className="sb-label">{title}</p>
          <p className="sb-sub">Live platform wallet</p>
        </div>

        <span className="sb-live-dot" aria-hidden="true" />
      </header>

      <div className="sb-body">
        {loading && (
          <div className="sb-loading">
            <Spinner size={22} color="#2563EB" label="Loading balance…" />
          </div>
        )}

        {isError && (
          <p className="sb-error">
            {error instanceof Error
              ? error.message
              : 'Could not load system balance.'}
          </p>
        )}

        {!loading && !isError && (
          <p className="sb-amount">
            <span className="sb-currency">{currency}</span>
            <span className="sb-number">{balance}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default SystemBalance;