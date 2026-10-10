// src/pages/accounts/components/EditPlanModal.tsx

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '../../../../components/toast/ToastContext';
import { Spinner } from '../../../../components/spinner/Spinner';
import {
  updatePlan,
  type BillingCycle,
  type Plan,
  type PlanCreatePayload,
} from '../api/plansApi';

import './editplanmodal.css';

/* ============================================================
   TYPES
   ============================================================ */

type EditPlanModalProps = {
  plan: Plan | null;
  open: boolean;
  onClose: () => void;
};

/* ============================================================
   HELPERS
   ============================================================ */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.floor(n);
}

function stringOrEmpty(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

/* ============================================================
   COMPONENT
   ============================================================ */

function EditPlanModal({ plan, open, onClose }: EditPlanModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  /* ── Form state — reset whenever the plan changes ──── */
  const [planName, setPlanName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(true);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [billingCycle, setBillingCycle] =
    useState<BillingCycle>('monthly');

  const [businessesLimit, setBusinessesLimit] = useState('');
  const [postsLimit, setPostsLimit] = useState('');
  const [productsLimit, setProductsLimit] = useState('');
  const [imagesPerProduct, setImagesPerProduct] = useState('');
  const [storiesPerMonth, setStoriesPerMonth] = useState('');

  useEffect(() => {
    if (!plan) return;
    setPlanName(plan.plan_name);
    setSlug(plan.slug);
    setSlugTouched(true);
    setDescription(plan.description ?? '');
    setPrice(String(plan.price));
    setBillingCycle(plan.billing_cycle);
    setBusinessesLimit(stringOrEmpty(plan.businesses_limit));
    setPostsLimit(stringOrEmpty(plan.posts_limit));
    setProductsLimit(stringOrEmpty(plan.products_limit));
    setImagesPerProduct(stringOrEmpty(plan.images_per_product));
    setStoriesPerMonth(stringOrEmpty(plan.stories_per_month));
  }, [plan]);

  /* ── Escape closes the modal ───────────────────────── */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  /* ── Handlers ──────────────────────────────────────── */
  const handleNameChange = (value: string) => {
    setPlanName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(slugify(value));
  };

  /* ── Mutation ──────────────────────────────────────── */
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<PlanCreatePayload>) =>
      updatePlan(plan!.slug, payload),
    onSuccess: (res) => {
      toast.success(res.message || 'Plan updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not update plan.');
    },
  });

  const saving = updateMutation.isPending;

  /* ── Submit ────────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!plan) return;

    if (!planName.trim()) {
      toast.error('Plan name is required.');
      return;
    }
    if (!slug.trim()) {
      toast.error('Slug is required.');
      return;
    }

    const payload: Partial<PlanCreatePayload> = {
      plan_name: planName.trim(),
      slug: slug.trim(),
      description: description.trim(),
      price: price.trim() === '' ? '0' : price.trim(),
      billing_cycle: billingCycle,

      businesses_limit: numberOrNull(businessesLimit),
      posts_limit: numberOrNull(postsLimit),
      products_limit: numberOrNull(productsLimit),
      images_per_product: numberOrNull(imagesPerProduct),
      stories_per_month: numberOrNull(storiesPerMonth),
    };

    updateMutation.mutate(payload);
  };

  /* ── Render ────────────────────────────────────────── */
  if (!open || !plan) return null;

  return (
    <div
      className="editplan-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${plan.plan_name}`}
      onClick={onClose}
    >
      <div
        className="editplan-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="editplan-head">
          <div>
            <h2 className="editplan-title">
              Edit "{plan.plan_name}"
            </h2>
            <p className="editplan-sub">
              Update any field. Leaving a limit empty means it's
              unlimited on this plan.
            </p>
          </div>

          <button
            type="button"
            className="editplan-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Body */}
        <form className="editplan-form" onSubmit={handleSubmit} noValidate>

          {/* Identity */}
          <section className="editplan-section">
            <h3 className="editplan-section-title">Identity</h3>

            <div className="editplan-field">
              <label htmlFor="ep_plan_name">Plan name *</label>
              <input
                id="ep_plan_name"
                type="text"
                value={planName}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={saving}
                required
              />
            </div>

            <div className="editplan-field">
              <label htmlFor="ep_slug">Slug *</label>
              <input
                id="ep_slug"
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                disabled={saving}
                required
              />
            </div>

            <div className="editplan-field">
              <label htmlFor="ep_description">Description</label>
              <textarea
                id="ep_description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
              />
            </div>
          </section>

          {/* Pricing */}
          <section className="editplan-section">
            <h3 className="editplan-section-title">Pricing</h3>

            <div className="editplan-grid-2">
              <div className="editplan-field">
                <label htmlFor="ep_price">Price (KES)</label>
                <input
                  id="ep_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="editplan-field">
                <label htmlFor="ep_billing_cycle">Billing cycle</label>
                <select
                  id="ep_billing_cycle"
                  value={billingCycle}
                  onChange={(e) =>
                    setBillingCycle(e.target.value as BillingCycle)
                  }
                  disabled={saving}
                >
                  <option value="free">Free</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
            </div>
          </section>

          {/* Limits */}
          <section className="editplan-section">
            <h3 className="editplan-section-title">
              Limits
              <span className="editplan-section-hint">
                Leave empty for unlimited
              </span>
            </h3>

            <div className="editplan-grid-2">
              <div className="editplan-field">
                <label htmlFor="ep_businesses">Businesses</label>
                <input
                  id="ep_businesses"
                  type="number"
                  min="0"
                  value={businessesLimit}
                  onChange={(e) => setBusinessesLimit(e.target.value)}
                  placeholder="∞"
                  disabled={saving}
                />
              </div>

              <div className="editplan-field">
                <label htmlFor="ep_posts">Posts per business</label>
                <input
                  id="ep_posts"
                  type="number"
                  min="0"
                  value={postsLimit}
                  onChange={(e) => setPostsLimit(e.target.value)}
                  placeholder="∞"
                  disabled={saving}
                />
              </div>

              <div className="editplan-field">
                <label htmlFor="ep_products">
                  Products per business
                </label>
                <input
                  id="ep_products"
                  type="number"
                  min="0"
                  value={productsLimit}
                  onChange={(e) => setProductsLimit(e.target.value)}
                  placeholder="∞"
                  disabled={saving}
                />
              </div>

              <div className="editplan-field">
                <label htmlFor="ep_images">Images per product</label>
                <input
                  id="ep_images"
                  type="number"
                  min="0"
                  value={imagesPerProduct}
                  onChange={(e) => setImagesPerProduct(e.target.value)}
                  placeholder="∞"
                  disabled={saving}
                />
              </div>

              <div className="editplan-field">
                <label htmlFor="ep_stories">
                  Stories per month
                </label>
                <input
                  id="ep_stories"
                  type="number"
                  min="0"
                  value={storiesPerMonth}
                  onChange={(e) => setStoriesPerMonth(e.target.value)}
                  placeholder="∞"
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="editplan-actions">
            <button
              type="button"
              className="editplan-btn editplan-btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="editplan-btn editplan-btn-primary"
              disabled={saving}
            >
              {saving ? (
                <span className="editplan-btn-spinner">
                  <Spinner size={16} label="Saving…" />
                </span>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditPlanModal;