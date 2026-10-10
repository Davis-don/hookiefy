// src/pages/accounts/User/components/BillingPlanCard.tsx

import { useState } from 'react';

import { useAuthStore } from '../../../../store/authStore';

import type { Plan } from '../api/billingApi';

import BillingPaymentModal from './BillingPaymentModal';

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
  const [modalOpen, setModalOpen] = useState(false);

  const highlighted = isCurrent || isEffective;

  const handleClick = () => {
    setModalOpen(true);
  };

  /* ── Badge logic ────────────────────────────────────── */
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

  /* ── Footer button logic ────────────────────────────
     Four states:
       - Current + expired        → red "Expired" button
       - Current + active         → disabled "Current plan"
       - Free (not current)       → non-actionable label
       - Paid (not current)       → opens modal
     ────────────────────────────────────────────────── */
  const renderFooter = () => {
    if (isCurrent) {
      if (isExpired) {
        return (
          <button
            type="button"
            className="billing-plan-btn is-expired"
            onClick={handleClick}
          >
            Expired — Renew
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
      >
        Choose this plan
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

      {/* Modal — mounts once per card, opens on demand */}
      <BillingPaymentModal
        plan={plan}
        open={modalOpen}
        defaultPhone={user?.phone_number ?? ''}
        email={user?.email ?? ''}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

export default BillingPlanCard;