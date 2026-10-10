// src/pages/accounts/components/PlanForm.tsx

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useToast } from '../../../../components/toast/ToastContext';
import { Spinner } from '../../../../components/spinner/Spinner';
import {
  createPlan,
  type BillingCycle,
  type PlanCreatePayload,
} from '../api/plansApi';

import './planform.css';

/* ============================================================
   TYPES
   ============================================================ */

type PlanFormProps = {
  onCancel: () => void;
  onCreated: () => void;
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

/** Convert a form string into a number | null (blank = unlimited). */
function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.floor(n);
}

/* ============================================================
   COMPONENT
   ============================================================ */

function PlanForm({ onCancel, onCreated }: PlanFormProps) {
  const toast = useToast();

  /* ── Identity ──────────────────────────────────────── */
  const [planName, setPlanName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');

  /* ── Pricing ───────────────────────────────────────── */
  const [price, setPrice] = useState('');
  const [billingCycle, setBillingCycle] =
    useState<BillingCycle>('monthly');

  /* ── Limits (blank = unlimited) ────────────────────── */
  const [businessesLimit, setBusinessesLimit] = useState('');
  const [postsLimit, setPostsLimit] = useState('');
  const [productsLimit, setProductsLimit] = useState('');
  const [imagesPerProduct, setImagesPerProduct] = useState('');
  const [storiesPerMonth, setStoriesPerMonth] = useState('');

  /* ── Field handlers ────────────────────────────────── */
  const handleNameChange = (value: string) => {
    setPlanName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(slugify(value));
  };

  /* ── Mutation ──────────────────────────────────────── */
  const createMutation = useMutation({
    mutationFn: (payload: PlanCreatePayload) => createPlan(payload),
    onSuccess: (res) => {
      toast.success(
        res.message ||
          (res.was_first_plan
            ? 'Plan created. This is the default plan.'
            : 'Plan created successfully.'),
      );
      onCreated();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not create plan.');
    },
  });

  /* ── Submit ────────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!planName.trim()) {
      toast.error('Plan name is required.');
      return;
    }
    if (!slug.trim()) {
      toast.error('Slug is required.');
      return;
    }

    const payload: PlanCreatePayload = {
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

    createMutation.mutate(payload);
  };

  const saving = createMutation.isPending;

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="planform-shell">
      <header className="planform-head">
        <h1 className="planform-title">Add a plan</h1>
        <p className="planform-sub">
          Fill in the details. Leaving a limit empty means that
          resource is unlimited on this plan.
        </p>
      </header>

      <form className="planform" onSubmit={handleSubmit} noValidate>

        {/* ── Identity ─────────────────────────────────── */}
        <section className="planform-section">
          <h2 className="planform-section-title">Identity</h2>

          <div className="planform-field">
            <label htmlFor="plan_name">Plan name *</label>
            <input
              id="plan_name"
              type="text"
              value={planName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Starter"
              disabled={saving}
              required
            />
          </div>

          <div className="planform-field">
            <label htmlFor="slug">Slug *</label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="e.g. starter"
              disabled={saving}
              required
            />
            <span className="planform-hint">
              URL-safe identifier. Auto-filled from the name.
            </span>
          </div>

          <div className="planform-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short marketing blurb shown under the plan name."
              disabled={saving}
            />
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────── */}
        <section className="planform-section">
          <h2 className="planform-section-title">Pricing</h2>

          <div className="planform-grid-2">
            <div className="planform-field">
              <label htmlFor="price">Price (KES)</label>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                disabled={saving}
              />
              <span className="planform-hint">
                Set 0 for a free plan.
              </span>
            </div>

            <div className="planform-field">
              <label htmlFor="billing_cycle">Billing cycle</label>
              <select
                id="billing_cycle"
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

        {/* ── Limits ───────────────────────────────────── */}
        <section className="planform-section">
          <h2 className="planform-section-title">
            Limits
            <span className="planform-section-hint">
              Leave empty for unlimited
            </span>
          </h2>

          <div className="planform-grid-2">
            <div className="planform-field">
              <label htmlFor="businesses_limit">Businesses</label>
              <input
                id="businesses_limit"
                type="number"
                min="0"
                value={businessesLimit}
                onChange={(e) => setBusinessesLimit(e.target.value)}
                placeholder="∞"
                disabled={saving}
              />
            </div>

            <div className="planform-field">
              <label htmlFor="posts_limit">Posts per business</label>
              <input
                id="posts_limit"
                type="number"
                min="0"
                value={postsLimit}
                onChange={(e) => setPostsLimit(e.target.value)}
                placeholder="∞"
                disabled={saving}
              />
            </div>

            <div className="planform-field">
              <label htmlFor="products_limit">
                Products per business
              </label>
              <input
                id="products_limit"
                type="number"
                min="0"
                value={productsLimit}
                onChange={(e) => setProductsLimit(e.target.value)}
                placeholder="∞"
                disabled={saving}
              />
            </div>

            <div className="planform-field">
              <label htmlFor="images_per_product">
                Images per product
              </label>
              <input
                id="images_per_product"
                type="number"
                min="0"
                value={imagesPerProduct}
                onChange={(e) => setImagesPerProduct(e.target.value)}
                placeholder="∞"
                disabled={saving}
              />
            </div>

            <div className="planform-field">
              <label htmlFor="stories_per_month">
                Stories per month
              </label>
              <input
                id="stories_per_month"
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

        {/* ── Actions ──────────────────────────────────── */}
        <div className="planform-actions">
          <button
            type="button"
            className="planform-btn planform-btn-ghost"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="planform-btn planform-btn-primary"
            disabled={saving}
          >
            {saving ? (
              <span className="planform-btn-spinner">
                <Spinner size={16} label="Creating…" />
              </span>
            ) : (
              'Create plan'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PlanForm;