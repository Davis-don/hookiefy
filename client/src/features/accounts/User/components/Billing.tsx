// src/pages/accounts/User/components/BillingTab.tsx

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../../../store/authStore';
import { Spinner } from '../../../../components/spinner/Spinner';

import { fetchCurrentSubscription } from '../api/billingApi';
import { fetchAllPlans } from '../api/plansApi';

import BillingCurrentPlan from './BillingCurrentPlan';
import BillingPlanCard from './BillingPlanCard';

import './billings.css';

function BillingTab() {
  const access = useAuthStore((s) => s.access);
  const queryClient = useQueryClient();

  /* ── Current subscription ─────────────────────────── */
  const {
    data: current,
    isLoading: currentLoading,
    isError: currentError,
    error: currentErrorObj,
  } = useQuery({
    queryKey: ['current-subscription', access],
    queryFn: fetchCurrentSubscription,
    enabled: !!access,
    staleTime: 30_000,
  });

  /* ── All active plans ─────────────────────────────── */
  const {
    data: plans = [],
    isLoading: plansLoading,
    isError: plansError,
    error: plansErrorObj,
  } = useQuery({
    queryKey: ['plans-public', access],
    queryFn: fetchAllPlans,
    enabled: !!access,
    staleTime: 60_000,
  });

  const refreshing = currentLoading || plansLoading;

  return (
    <div className="ua-tab">
      <header className="billing-head">
        <h2 className="ua-tab-title">Billing</h2>
        <p className="ua-tab-text">
          Manage your subscription, upgrade plans, and see your
          renewal status.
        </p>
      </header>

      {currentError && (
        <div className="billing-error">
          {(currentErrorObj as Error)?.message ||
            'Could not load your subscription.'}
        </div>
      )}

      {plansError && (
        <div className="billing-error">
          {(plansErrorObj as Error)?.message ||
            'Could not load available plans.'}
        </div>
      )}

      {refreshing && (
        <div className="billing-loading">
          <Spinner size={22} color="#2563EB" label="Loading billing…" />
        </div>
      )}

      {!refreshing && !currentError && (
        <>
          <BillingCurrentPlan
            subscription={current?.subscription ?? null}
            effectivePlan={current?.effective_plan ?? null}
            hasActive={current?.has_active_subscription ?? false}
          />

          <section className="billing-plans">
            <header className="billing-plans-head">
              <h3 className="billing-plans-title">
                Available plans
              </h3>
              <p className="billing-plans-sub">
                Change plans any time. Your current plan is
                highlighted.
              </p>
            </header>

            {plans.length === 0 && !plansError && (
              <p className="billing-plans-empty">
                No plans are available right now. Please check
                back later.
              </p>
            )}

            <div className="billing-plans-grid">
              {plans.map((plan) => (
                <BillingPlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={
                    current?.subscription?.plan?.id === plan.id &&
                    current.has_active_subscription
                  }
                  isEffective={
                    !current?.has_active_subscription &&
                    current?.effective_plan?.id === plan.id
                  }
                  isExpired={
                    current?.subscription?.plan?.id === plan.id &&
                    !!current?.subscription?.is_expired
                  }
                  onChanged={() => {
                    queryClient.invalidateQueries({
                      queryKey: ['current-subscription'],
                    });
                  }}
                />
              ))}
            </div>
          </section>

          <footer className="billing-footer">
            <p className="billing-footer-title">
              Need help with billing?
            </p>
            <p className="billing-footer-sub">
              Reach out at{' '}
              <a href="mailto:support@youpata.co.ke">
                davismugoikou@gmail.com
              </a>{' '}
              and we'll sort it out.
            </p>
          </footer>
        </>
      )}
    </div>
  );
}

export default BillingTab;