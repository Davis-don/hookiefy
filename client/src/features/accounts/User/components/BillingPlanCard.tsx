// src/pages/accounts/User/components/BillingPlanCard.tsx

import { useState } from 'react';

import { useAuthStore } from '../../../../store/authStore';
import { useToast } from '../../../../components/toast/ToastContext';

import type { Plan } from '../api/billingApi';
import {
  preCheckDowngrade,
  type DowngradePreCheckResponse,
} from '../api/billingApi';

import BillingPaymentModal from './BillingPaymentModal';
import DowngradeConfirmModal from './DowngradeConfirmModal';

import './billings.css';

type BillingPlanCardProps = {
  plan: Plan;
  isCurrent: boolean;
  isEffective: boolean;
  /** True when the user's current subscription has expired. */
  isExpired?: boolean;
  onChanged?: () => void;
};

function capLabel(value: number | null, label: string): string {
  if (value === null) return `Unlimited ${label}`;
  return `${value} ${label}`;
}

function BillingPlanCard({
  plan,
  isCurrent,
  isEffective,
  isExpired = false,
}: BillingPlanCardProps) {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  /* Payment modal */
  const [modalOpen, setModalOpen] = useState(false);

  /* Downgrade guard */
  const [audit, setAudit] = useState<DowngradePreCheckResponse | null>(
    null,
  );
  const [checking, setChecking] = useState(false);

  const highlighted = isCurrent || isEffective;

  /* ── Step 1: click handler — check downgrade, then open payment ── */
  const handleClick = async () => {
    if (checking) return;
    setChecking(true);

    try {
      const report = await preCheckDowngrade(plan.slug);

      if (report.ok) {
        // Content fits — open payment directly.
        setModalOpen(true);
        return;
      }

      // Overflow — show confirmation modal.
      setAudit(report);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not check plan downgrade.',
      );
    } finally {
      setChecking(false);
    }
  };

  /* ── Step 2: user confirmed → re-check with token → prune → pay ── */
  const handleConfirmDowngrade = async () => {
    if (!audit) return;

    try {
      const result = await preCheckDowngrade(
        plan.slug,
        audit.confirmation_token ?? undefined,
      );

      if (!result.ok) {
        // Stale token — refresh the modal with the new report
        toast.error(
          result.message ||
            'Your content changed. Please review again.',
        );
        setAudit(result);
        return;
      }

      toast.success(result.message);
      setAudit(null);
      setModalOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not complete downgrade.',
      );
    }
  };

  const handleCancelDowngrade = () => {
    setAudit(null);
  };

  /* ── Badges ─────────────────────────────────────────── */
  const renderBadges = () => (
    <div className="billing-plan-badges">
      {isCurrent && !isExpired && (
        <span className="billing-plan-badge is-current">
          Current
        </span>
      )}
      {isCurrent && isExpired && (
        <span className="billing-plan-badge is-expired">
          Expired
        </span>
      )}
      {!isCurrent && isEffective && (
        <span className="billing-plan-badge is-default">
          Default
        </span>
      )}
      {plan.is_free && (
        <span className="billing-plan-badge is-free">Free</span>
      )}
    </div>
  );

  /* ── Footer ─────────────────────────────────────────── */
  const renderFooter = () => {
    if (isCurrent) {
      if (isExpired) {
        return (
          <button
            type="button"
            className="billing-plan-btn is-expired"
            onClick={handleClick}
            disabled={checking}
          >
            {checking ? 'Checking…' : 'Expired — Renew'}
          </button>
        );
      }

      return (
        <button
          type="button"
          className="billing-plan-btn is-current"
          disabled
        >
          Current plan
        </button>
      );
    }

    if (plan.is_free) {
      return (
        <span className="billing-plan-unavailable">
          Included by default
        </span>
      );
    }

    return (
      <button
        type="button"
        className="billing-plan-btn"
        onClick={handleClick}
        disabled={checking}
      >
        {checking ? 'Checking…' : 'Choose this plan'}
      </button>
    );
  };

  return (
    <>
      <article
        className={
          'billing-plan' +
          (highlighted ? ' is-current' : '') +
          (isCurrent && isExpired ? ' is-expired' : '')
        }
      >
        <header className="billing-plan-head">
          <h4 className="billing-plan-name">{plan.plan_name}</h4>
          {renderBadges()}
        </header>

        <div className="billing-plan-price">
          <span className="billing-plan-price-value">
            {plan.is_free ? 'Free' : plan.price_display}
          </span>
          {!plan.is_free && (
            <span className="billing-plan-price-cycle">
              {plan.billing_cycle === 'monthly' && 'per month'}
              {plan.billing_cycle === 'yearly' && 'per year'}
              {plan.billing_cycle === 'lifetime' && 'one-time'}
            </span>
          )}
        </div>

        {plan.description && (
          <p className="billing-plan-desc">{plan.description}</p>
        )}

        <ul className="billing-plan-features">
          <li>{capLabel(plan.businesses_limit, 'businesses')}</li>
          <li>{capLabel(plan.posts_limit, 'posts per business')}</li>
          <li>{capLabel(plan.products_limit, 'products per business')}</li>
          <li>{capLabel(plan.images_per_product, 'images per product')}</li>
          <li>{capLabel(plan.stories_per_month, 'stories per month')}</li>
        </ul>

        {plan.properties.length > 0 && (
          <ul className="billing-plan-props">
            {plan.properties.map((p) => (
              <li
                key={p.id}
                className={
                  'billing-plan-prop' +
                  (p.is_highlighted ? ' is-highlighted' : '')
                }
              >
                <span className="billing-plan-prop-name">
                  {p.name}
                </span>
                <span className="billing-plan-prop-value">
                  {p.value}
                </span>
              </li>
            ))}
          </ul>
        )}

        <footer className="billing-plan-foot">
          {renderFooter()}
        </footer>
      </article>

      {/* Payment modal */}
      <BillingPaymentModal
        plan={plan}
        open={modalOpen}
        defaultPhone={user?.phone_number ?? ''}
        email={user?.email ?? ''}
        onClose={() => setModalOpen(false)}
      />

      {/* Downgrade confirmation modal */}
      {audit && (
        <DowngradeConfirmModal
          audit={audit}
          onCancel={handleCancelDowngrade}
          onConfirm={handleConfirmDowngrade}
        />
      )}
    </>
  );
}

export default BillingPlanCard;