import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/toast/ToastContext';
import { Spinner } from '../../../components/spinner/Spinner';
import { fetchBusiness, deleteBusiness } from '../api/businessApi';
import Addpost from './Addpost';
import EditBusiness from './EditBusiness';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import './currentbusiness.css';

type CurrentbusinessProps = {
  businessId: number;
  onBack?: () => void;
  onDeleted?: () => void;
};

function Currentbusiness({
  businessId,
  onBack,
  onDeleted,
}: CurrentbusinessProps) {
  const access = useAuthStore((s) => s.access);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [addingPost, setAddingPost] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: () => deleteBusiness(access, businessId),
    onSuccess: (res) => {
      toast.success(res.message || 'Business deleted.');
      queryClient.invalidateQueries({ queryKey: ['business-items'] });
      setConfirmDeleteOpen(false);
      onDeleted?.();
      onBack?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not delete this business.');
      setConfirmDeleteOpen(false);
    },
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

  // ── Edit view takes over ──────────────────────────────
  if (editing) {
    return (
      <EditBusiness
        businessId={business.id}
        onBack={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  // ── Add-post view takes over ──────────────────────────
  if (addingPost) {
    return (
      <Addpost
        businessId={business.id}
        businessName={business.business_name}
        onBack={() => setAddingPost(false)}
        onCreated={() => setAddingPost(false)}
      />
    );
  }

  return (
    <div className="cb-shell">
      {/* ── Top bar ────────────────────────────────── */}
      <div className="cb-topbar">
        <div className="cb-topbar-left">
          {onBack && (
            <button
              type="button"
              className="cb-icon-btn cb-icon-btn-back"
              onClick={onBack}
              aria-label="Back to list"
              title="Back to list"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          <span className="cb-topbar-crumb">My Businesses</span>
        </div>

        <div className="cb-topbar-actions">
          {/* New post — speech bubble with + */}
          <button
            type="button"
            className="cb-icon-btn cb-icon-btn-add"
            onClick={() => setAddingPost(true)}
            aria-label="Write a new post for this business"
            title="New post"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="12" y1="8" x2="12" y2="14" />
              <line x1="9" y1="11" x2="15" y2="11" />
            </svg>
          </button>

          {/* Edit */}
          <button
            type="button"
            className="cb-icon-btn cb-icon-btn-edit"
            onClick={() => setEditing(true)}
            aria-label="Edit business"
            title="Edit"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>

          {/* Delete */}
          <button
            type="button"
            className="cb-icon-btn cb-icon-btn-danger"
            onClick={() => setConfirmDeleteOpen(true)}
            aria-label="Delete business"
            title="Delete"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Header ─────────────────────────────────── */}
      <div className="cb-header">
        <h2 className="cb-title">
          {business.business_name || 'Untitled business'}
        </h2>

        <div className="cb-tags">
          <span className={`cb-tag cb-tag-${business.business_category}`}>
            {business.business_category_display}
          </span>
          <span
            className={`cb-tag cb-tag-status is-${String(business.status || '')
              .toLowerCase()
              .trim()}`}
          >
            {business.status_display || business.status || 'Unknown'}
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

      {/* ── Delete confirmation ─────────────────────── */}
      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        title={`Delete "${business.business_name || 'this business'}"?`}
        message="This action cannot be undone. All posts, images, and details belonging to this business will be permanently removed."
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        busy={deleteMutation.isPending}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}

export default Currentbusiness;