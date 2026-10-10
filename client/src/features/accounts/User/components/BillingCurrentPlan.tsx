// src/pages/accounts/User/components/BillingCurrentPlan.tsx

import type { Plan, Subscription } from '../api/billingApi';

type BillingCurrentPlanProps = {
  subscription: Subscription | null;
  effectivePlan: Plan | null;
  hasActive: boolean;
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function BillingCurrentPlan({
  subscription,
  effectivePlan,
  hasActive,
}: BillingCurrentPlanProps) {
  const plan = subscription?.plan ?? effectivePlan;

  // The subscription may be expired even if `hasActive` is
  // false. We use `effective_status === 'expired'` or the
  // `is_expired` boolean — whichever the backend sent.
  const isExpired =
    !!subscription &&
    (subscription.is_expired ||
      subscription.effective_status === 'expired');

  if (!plan) {
    return (
      <section className="billing-current billing-current--empty">
        <p className="billing-current-empty-title">
          No plan assigned
        </p>
        <p className="billing-current-empty-sub">
          Choose a plan below to get started.
        </p>
      </section>
    );
  }

  /* ── Badge label + variant ──────────────────────────
     Expired  → red
     Active   → green
     Default  → blue
     ────────────────────────────────────────────────── */
  const statusLabel = isExpired
    ? 'Expired'
    : hasActive
      ? 'Active'
      : 'Default';

  const statusClass = isExpired
    ? 'is-expired'
    : hasActive
      ? 'is-active'
      : 'is-fallback';

  return (
    <section
      className={
        'billing-current' + (isExpired ? ' is-expired' : '')
      }
    >
      <header className="billing-current-head">
        <div>
          <span className="billing-current-label">
            Current plan
          </span>
          <h3 className="billing-current-name">
            {plan.plan_name}
          </h3>
        </div>

        <span className={'billing-current-status ' + statusClass}>
          {statusLabel}
        </span>
      </header>

      <div className="billing-current-price">
        <span className="billing-current-price-value">
          {plan.is_free ? 'Free' : plan.price_display}
        </span>
        {!plan.is_free && (
          <span className="billing-current-price-cycle">
            {plan.billing_cycle === 'monthly' && 'per month'}
            {plan.billing_cycle === 'yearly' && 'per year'}
            {plan.billing_cycle === 'lifetime' && 'one-time'}
          </span>
        )}
      </div>

      <ul className="billing-current-facts">
        {subscription && (
          <>
            <li>
              <span className="billing-current-fact-label">
                Status
              </span>
              <span
                className={
                  'billing-current-fact-value' +
                  (isExpired ? ' is-expired' : '')
                }
              >
                {subscription.effective_status}
              </span>
            </li>
            <li>
              <span className="billing-current-fact-label">
                Started
              </span>
              <span className="billing-current-fact-value">
                {formatDate(subscription.start_date)}
              </span>
            </li>
            <li>
              <span className="billing-current-fact-label">
                {subscription.end_date ? 'Renews' : 'Expires'}
              </span>
              <span
                className={
                  'billing-current-fact-value' +
                  (isExpired ? ' is-expired' : '')
                }
              >
                {subscription.end_date
                  ? formatDate(subscription.end_date)
                  : 'Never'}
              </span>
            </li>
            <li>
              <span className="billing-current-fact-label">
                Time left
              </span>
              <span
                className={
                  'billing-current-fact-value' +
                  (isExpired ? ' is-expired' : '')
                }
              >
                {subscription.duration_display}
              </span>
            </li>
          </>
        )}
        {!subscription && (
          <li>
            <span className="billing-current-fact-label">
              Note
            </span>
            <span className="billing-current-fact-value">
              You're on the default plan — subscribe below to
              upgrade.
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}

export default BillingCurrentPlan;