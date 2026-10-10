// src/pages/accounts/User/components/BillingPlanCard.tsx

import type { Plan } from '../api/billingApi';

import './billings.css';

type BillingPlanCardProps = {
  plan: Plan;
  isCurrent: boolean;
  isEffective: boolean;
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
}: BillingPlanCardProps) {
  const highlighted = isCurrent || isEffective;

  const handleClick = () => {
    window.alert(`You clicked: ${plan.plan_name}`);
  };

  return (
    <article
      className={
        'billing-plan' + (highlighted ? ' is-current' : '')
      }
    >
      <header className="billing-plan-head">
        <h4 className="billing-plan-name">{plan.plan_name}</h4>

        <div className="billing-plan-badges">
          {isCurrent && (
            <span className="billing-plan-badge is-current">
              Current
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
        {isCurrent ? (
          <button
            type="button"
            className="billing-plan-btn is-current"
            disabled
          >
            Current plan
          </button>
        ) : (
          <button
            type="button"
            className="billing-plan-btn"
            onClick={handleClick}
          >
            {plan.is_free ? 'Switch to this plan' : 'Choose this plan'}
          </button>
        )}
      </footer>
    </article>
  );
}

export default BillingPlanCard;