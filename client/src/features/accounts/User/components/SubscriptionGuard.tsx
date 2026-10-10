// src/pages/accounts/User/components/SubscriptionGuard.tsx

import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../../../../store/authStore';

import { fetchCurrentSubscription } from '../api/billingApi';

import './subscriptionguard.css';

type SubscriptionGuardProps = {
  children: React.ReactNode;
  /** Called when the user clicks "Upgrade plan". */
  onUpgrade: () => void;
};

function SubscriptionGuard({
  children,
  onUpgrade,
}: SubscriptionGuardProps) {
  const access = useAuthStore((s) => s.access);

  const { data } = useQuery({
    queryKey: ['current-subscription', access],
    queryFn: fetchCurrentSubscription,
    enabled: !!access,
    staleTime: 30_000,
  });

  const subscription = data?.subscription ?? null;

  // The overlay shows when there's a subscription row AND
  // that row's effective status is "expired". A user with
  // no subscription at all (falling back to the default
  // plan) is NOT locked out — they're on the free tier by
  // design.
  const isExpired =
    !!subscription &&
    (subscription.is_expired ||
      subscription.effective_status === 'expired');

  return (
    <div className="subguard">
      {/* Content is always rendered — the overlay just
          sits on top of it. */}
      <div
        className={
          'subguard__content' +
          (isExpired ? ' is-blurred' : '')
        }
        aria-hidden={isExpired}
      >
        {children}
      </div>

      {isExpired && (
        <div
          className="subguard__overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Plan expired"
        >
          <div className="subguard__card">
            {/* Icon */}
            <div
              className="subguard__icon"
              aria-hidden="true"
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16" x2="12" y2="16.01" />
              </svg>
            </div>

            {/* Copy */}
            <h2 className="subguard__title">
              Your plan has expired
            </h2>
            <p className="subguard__sub">
              {subscription?.plan?.plan_name
                ? `Your ${subscription.plan.plan_name} subscription has ended. Renew to keep publishing and interacting.`
                : 'Your subscription has ended. Renew to keep publishing and interacting.'}
            </p>

            {subscription?.end_date && (
              <p className="subguard__meta">
                Expired on{' '}
                {new Date(subscription.end_date).toLocaleDateString(
                  undefined,
                  {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  },
                )}
              </p>
            )}

            {/* Action */}
            <button
              type="button"
              className="subguard__cta"
              onClick={onUpgrade}
            >
              Upgrade your plan
            </button>

            <p className="subguard__hint">
              Your data is safe — it will be available again
              the moment you renew.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionGuard;