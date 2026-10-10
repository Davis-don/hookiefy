// src/pages/accounts/components/PlansList.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../../store/authStore';
import { useToast } from '../../../../components/toast/ToastContext';
import { Spinner } from '../../../../components/spinner/Spinner';

import {
  fetchAllPlans,
  deletePlan,
  setDefaultPlan,
  clearDefaultPlan,
  type Plan,
} from '../api/plansApi';

import ConfirmDeleteModal from '../../../businesses/components/ConfirmDeleteModal';
import EditPlanModal from './EditPlanModal';

import './planslist.css';

/* ============================================================
   TYPES
   ============================================================ */

type PlansListProps = {
  onAddPlan?: () => void;
};

/* ============================================================
   HELPERS
   ============================================================ */

function formatPrice(plan: Plan): string {
  if (plan.is_free) return 'Free';
  return plan.price_display;
}

function formatCap(value: number | null): string {
  if (value === null) return 'Unlimited';
  return String(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function cycleLabel(cycle: Plan['billing_cycle']): string {
  switch (cycle) {
    case 'free':     return '';
    case 'monthly':  return 'per month';
    case 'yearly':   return 'per year';
    case 'lifetime': return 'one-time';
    default:         return '';
  }
}

/* ============================================================
   COMPONENT
   ============================================================ */

function PlansList({ onAddPlan }: PlansListProps) {
  const access = useAuthStore((s) => s.access);
  const toast = useToast();
  const queryClient = useQueryClient();

  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [editTarget, setEditTarget] = useState<Plan | null>(null);

  /* ── Fetch ──────────────────────────────────────────── */
  const {
    data: plans = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin-plans', access],
    queryFn: fetchAllPlans,
    enabled: !!access,
    staleTime: 30_000,
  });

  /* ── Delete ─────────────────────────────────────────── */
  const deleteMutation = useMutation({
    mutationFn: (slug: string) => deletePlan(slug),
    onSuccess: (res) => {
      toast.success(res.message || 'Plan deleted.');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not delete plan.');
      setDeleteTarget(null);
    },
  });

  /* ── Set default ────────────────────────────────────── */
  const setDefaultMutation = useMutation({
    mutationFn: (slug: string) => setDefaultPlan(slug),
    onSuccess: (res) => {
      toast.success(res.message || 'Default plan updated.');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not set default.');
    },
  });

  /* ── Clear default ──────────────────────────────────── */
  const clearDefaultMutation = useMutation({
    mutationFn: (slug: string) => clearDefaultPlan(slug),
    onSuccess: (res) => {
      toast.success(res.message || 'Default cleared.');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not clear default.');
    },
  });

  const busy =
    deleteMutation.isPending ||
    setDefaultMutation.isPending ||
    clearDefaultMutation.isPending;

  /* ── Loading ────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="planlist-state">
        <Spinner size={24} color="#2563EB" label="Loading plans…" />
      </div>
    );
  }

  /* ── Error ──────────────────────────────────────────── */
  if (isError) {
    return (
      <div className="planlist-state planlist-state-error">
        <p>{(error as Error)?.message || 'Could not load plans.'}</p>
        <button
          type="button"
          className="planlist-retry-btn"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? 'Retrying…' : 'Try again'}
        </button>
      </div>
    );
  }

  /* ── Empty ──────────────────────────────────────────── */
  if (plans.length === 0) {
    return (
      <div className="planlist-shell">
        <div className="planlist-empty">
          <p className="planlist-empty-title">No plans yet</p>
          <p className="planlist-empty-sub">
            Create your first plan. It will automatically be marked
            as the default.
          </p>
          {onAddPlan && (
            <button
              type="button"
              className="planlist-empty-cta"
              onClick={onAddPlan}
            >
              + Add a plan
            </button>
          )}
        </div>

        {onAddPlan && (
          <button
            type="button"
            className="planlist-fab"
            onClick={onAddPlan}
            aria-label="Add a plan"
            title="Add a plan"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
              strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  /* ── Card grid ──────────────────────────────────────── */
  return (
    <div className="planlist-shell">

      {/* Toolbar */}
      <div className="planlist-toolbar">
        <span className="planlist-count">
          {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
        </span>

        <button
          type="button"
          className="planlist-refresh-btn"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh"
          title="Refresh"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true"
            className={isFetching ? 'is-spinning' : ''}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className="planlist-grid">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={
              'plancard' +
              (plan.is_default ? ' is-default' : '') +
              (!plan.is_active ? ' is-inactive' : '')
            }
          >
            {/* Top */}
            <header className="plancard-head">
              <div className="plancard-title-block">
                <h2 className="plancard-name">{plan.plan_name}</h2>
                <span className="plancard-slug">/{plan.slug}</span>
              </div>

              <div className="plancard-badges">
                {plan.is_default && (
                  <span className="plancard-badge plancard-badge-default">
                    Default
                  </span>
                )}
                <span
                  className={
                    'plancard-badge ' +
                    (plan.is_active
                      ? 'plancard-badge-active'
                      : 'plancard-badge-inactive')
                  }
                >
                  {plan.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </header>

            {/* Price */}
            <div className="plancard-price-block">
              <span className="plancard-price">
                {formatPrice(plan)}
              </span>
              {!plan.is_free && (
                <span className="plancard-cycle">
                  {cycleLabel(plan.billing_cycle)}
                </span>
              )}
            </div>

            {/* Description */}
            {plan.description ? (
              <p className="plancard-desc">{plan.description}</p>
            ) : (
              <p className="plancard-desc plancard-desc-empty">
                No description yet.
              </p>
            )}

            {/* Limits */}
            <div className="plancard-section">
              <span className="plancard-section-label">Limits</span>
              <ul className="plancard-limits">
                <li>
                  <span className="plancard-limit-label">Businesses</span>
                  <span className="plancard-limit-value">
                    {formatCap(plan.businesses_limit)}
                  </span>
                </li>
                <li>
                  <span className="plancard-limit-label">
                    Posts per business
                  </span>
                  <span className="plancard-limit-value">
                    {formatCap(plan.posts_limit)}
                  </span>
                </li>
                <li>
                  <span className="plancard-limit-label">
                    Products per business
                  </span>
                  <span className="plancard-limit-value">
                    {formatCap(plan.products_limit)}
                  </span>
                </li>
                <li>
                  <span className="plancard-limit-label">
                    Images per product
                  </span>
                  <span className="plancard-limit-value">
                    {formatCap(plan.images_per_product)}
                  </span>
                </li>
                <li>
                  <span className="plancard-limit-label">
                    Stories per month
                  </span>
                  <span className="plancard-limit-value">
                    {formatCap(plan.stories_per_month)}
                  </span>
                </li>
              </ul>
            </div>

            {/* Flags */}
            {(plan.featured_listing ||
              plan.verified_premium_badge ||
              plan.priority_visibility) && (
              <div className="plancard-section">
                <span className="plancard-section-label">Includes</span>
                <ul className="plancard-flags">
                  {plan.featured_listing && <li>Featured listing</li>}
                  {plan.verified_premium_badge && (
                    <li>Verified premium badge</li>
                  )}
                  {plan.priority_visibility && (
                    <li>Priority visibility</li>
                  )}
                </ul>
              </div>
            )}

            {/* Footer */}
            <footer className="plancard-foot">
              <span className="plancard-created">
                Created {formatDate(plan.created_at)}
              </span>

              <div className="plancard-actions">
                {/* Star */}
                {plan.is_default ? (
                  <button
                    type="button"
                    className="plancard-action plancard-action-star is-active"
                    onClick={() =>
                      clearDefaultMutation.mutate(plan.slug)
                    }
                    disabled={busy}
                    aria-label="Clear default"
                    title="Clear default"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24"
                      fill="currentColor" stroke="currentColor"
                      strokeWidth="1.6" strokeLinecap="round"
                      strokeLinejoin="round" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="plancard-action plancard-action-star"
                    onClick={() => setDefaultMutation.mutate(plan.slug)}
                    disabled={busy}
                    aria-label="Set as default"
                    title="Set as default"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                )}

                {/* Edit — opens modal */}
                <button
                  type="button"
                  className="plancard-action plancard-action-edit"
                  onClick={() => setEditTarget(plan)}
                  disabled={busy}
                  aria-label="Edit plan"
                  title="Edit plan"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>

                {/* Delete */}
                <button
                  type="button"
                  className="plancard-action plancard-action-danger"
                  onClick={() => setDeleteTarget(plan)}
                  disabled={busy}
                  aria-label="Delete plan"
                  title="Delete plan"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </footer>
          </article>
        ))}
      </div>

      {/* FAB */}
      {onAddPlan && (
        <button
          type="button"
          className="planlist-fab"
          onClick={onAddPlan}
          aria-label="Add a plan"
          title="Add a plan"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {/* Delete confirmation */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title={`Delete "${deleteTarget?.plan_name ?? 'this plan'}"?`}
        message={
          deleteTarget?.is_default
            ? 'This plan is the default. Deleting it means new signups will not receive any plan until another default is set.'
            : 'This action cannot be undone. If any user is subscribed to this plan, deletion will be refused.'
        }
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.slug);
        }}
      />

      {/* Edit modal */}
      <EditPlanModal
        plan={editTarget}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
      />
    </div>
  );
}

export default PlansList;