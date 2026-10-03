import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { Spinner } from '../../../components/spinner/Spinner';
import { fetchBusiness } from '../api/businessApi';
import './currentbusiness.css';

type CurrentbusinessProps = {
  businessId: number;
  onBack?: () => void;
};

function Currentbusiness({ businessId, onBack }: CurrentbusinessProps) {
  const access = useAuthStore((s) => s.access);

  const {
    data: business,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['business', businessId, access],
    queryFn: () => fetchBusiness(access, businessId),
    enabled: !!access && !!businessId,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="cb-state">
        <Spinner size={20} color="#2563EB" label="Loading business…" />
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="cb-state cb-state-error">
        {(error as Error)?.message || 'Could not load that business.'}
      </div>
    );
  }

  return (
    <div className="cb-shell">
      {/* ── Top bar with back ──────────────────────── */}
      <div className="cb-topbar">
        {onBack && (
          <button type="button" className="cb-back" onClick={onBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to list
          </button>
        )}
      </div>

      {/* ── Header ─────────────────────────────────── */}
      <div className="cb-header">
        <h2 className="cb-title">{business.business_name || 'Untitled business'}</h2>

        <div className="cb-tags">
          <span className={`cb-tag cb-tag-${business.business_category}`}>
            {business.business_category_display}
          </span>
          <span className={`cb-tag cb-tag-status is-${business.status}`}>
            {business.status_display}
          </span>
        </div>
      </div>

      {/* ── Details grid ───────────────────────────── */}
      <div className="cb-grid">
        <div className="cb-field">
          <span className="cb-label">Business type</span>
          <span className="cb-value">{business.business_type || '—'}</span>
        </div>

        <div className="cb-field">
          <span className="cb-label">County</span>
          <span className="cb-value">{business.county || '—'}</span>
        </div>

        <div className="cb-field">
          <span className="cb-label">City / Town</span>
          <span className="cb-value">{business.city_town || '—'}</span>
        </div>

        <div className="cb-field">
          <span className="cb-label">Region / Area</span>
          <span className="cb-value">{business.region || '—'}</span>
        </div>
      </div>

      {/* ── Description ────────────────────────────── */}
      <div className="cb-field cb-field-full">
        <span className="cb-label">Description</span>
        <p className="cb-description">
          {business.description || 'No description provided.'}
        </p>
      </div>

      {/* ── Meta ───────────────────────────────────── */}
      <div className="cb-meta">
        <span>Created {new Date(business.created_at).toLocaleDateString()}</span>
        <span>·</span>
        <span>Updated {new Date(business.updated_at).toLocaleDateString()}</span>
      </div>

      {/* ── Actions ────────────────────────────────── */}
      <div className="cb-actions">
        <button type="button" className="cb-btn cb-btn-ghost">Edit</button>
        <button type="button" className="cb-btn cb-btn-ghost">Pause</button>
        <button type="button" className="cb-btn cb-btn-danger">Delete</button>
      </div>
    </div>
  );
}

export default Currentbusiness;