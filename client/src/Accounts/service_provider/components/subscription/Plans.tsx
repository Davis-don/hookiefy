// pages/Plans.tsx

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FiAward,
  FiLoader,
  FiAlertCircle,
  FiRefreshCw,
} from 'react-icons/fi';

import PlanCard from './PlanCard';
import type { Plan } from './PlanCard';
import PlanPurchaseSheet from './PlanPurchaseSheet';

import { useAuthStore } from '../../../../store/authtokenstore';

import './plans.css';

/* ─────────── Types ─────────── */

interface PlanCta {
  label: string;
  disabled: boolean;
}

interface PlanForMe extends Plan {
  is_current: boolean;
  cta: PlanCta;
}

interface SubscriptionSummary {
  has_subscription: boolean;
  is_free: boolean;
  is_active: boolean;
  is_expired: boolean;
  plan_id: number | null;
  plan_name: string | null;
}

interface PlansForMeResponse {
  count: number;
  plans: PlanForMe[];
  subscription: SubscriptionSummary;
}

/* ─────────── API ─────────── */

function resolveApiOrigin(): string {
  // @ts-ignore
  const envUrl: string | undefined = import.meta.env?.VITE_API_URL;

  if (!envUrl || !envUrl.trim()) {
    return '';
  }

  return envUrl.replace(/\/+$/, '');
}

const API_ORIGIN = resolveApiOrigin();

/* ─────────── Fetch plans for current user ─────────── */

async function fetchPlansForMe(
  access: string
): Promise<PlansForMeResponse> {
  const url = API_ORIGIN
    ? `${API_ORIGIN}/plans/for-me/`
    : `/plans/for-me/`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${access}`,
    },
  });

  const contentType =
    response.headers.get('content-type') || '';

  const raw = await response.text().catch(() => '');

  if (!response.ok) {
    throw new Error(
      `Failed to load plans (${response.status}). ${raw.slice(
        0,
        120
      )}`
    );
  }

  if (!contentType.includes('application/json')) {
    throw new Error(
      `Expected JSON from ${url}, got "${contentType}".`
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      'The server returned invalid JSON.'
    );
  }
}

/* ─────────── Page ─────────── */

const Plans = () => {
  const { access } = useAuthStore();

  const [sheetOpen, setSheetOpen] = useState(false);

  const [sheetPlan, setSheetPlan] =
    useState<Plan | null>(null);

  /* ─────────── Plans Query ─────────── */

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PlansForMeResponse, Error>({
    queryKey: ['plans-for-me', access],

    queryFn: () => {
      if (!access) {
        throw new Error(
          'Authentication required.'
        );
      }

      return fetchPlansForMe(access);
    },

    enabled: !!access,

    staleTime: 5 * 60_000,

    refetchOnWindowFocus: false,
  });

  const plans = data?.plans ?? [];

  const subscription =
    data?.subscription ?? null;

  /* ─────────── Subscription State ─────────── */

  const isFreeSubscription =
    subscription?.is_free === true;

  const isActivePaidSubscription =
    subscription?.has_subscription === true &&
    subscription?.is_active === true &&
    subscription?.is_free === false;

  const isExpiredPaidSubscription =
    subscription?.has_subscription === true &&
    subscription?.is_expired === true &&
    subscription?.is_free === false;

  /* ─────────── Open Purchase Sheet ─────────── */

  const handleUpgrade = (plan: Plan) => {
    if (!access) {
      alert('Please sign in again.');
      return;
    }

    setSheetPlan(plan);
    setSheetOpen(true);
  };

  /* ─────────── Loading ─────────── */

  if (isLoading) {
    return (
      <div className="plans-page">
        <header className="plans-header">
          <h1 className="plans-title">
            <FiAward /> Plans &amp; Pricing
          </h1>
        </header>

        <div className="plans-state">
          <FiLoader className="plans-spin" />

          <p>
            Loading plans…
          </p>
        </div>
      </div>
    );
  }

  /* ─────────── Error ─────────── */

  if (isError) {
    return (
      <div className="plans-page">
        <header className="plans-header">
          <h1 className="plans-title">
            <FiAward /> Plans &amp; Pricing
          </h1>
        </header>

        <div className="plans-state plans-state--error">
          <FiAlertCircle />

          <p>
            Couldn't load plans
          </p>

          <span className="plans-state-sub">
            {error?.message}
          </span>

          <button
            type="button"
            className="plans-retry"
            onClick={() => refetch()}
          >
            <FiRefreshCw />
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ─────────── Empty ─────────── */

  if (plans.length === 0) {
    return (
      <div className="plans-page">
        <header className="plans-header">
          <h1 className="plans-title">
            <FiAward /> Plans &amp; Pricing
          </h1>
        </header>

        <div className="plans-state plans-state--empty">
          <div className="plans-empty-icon">
            <FiAward />
          </div>

          <p>
            No plans available
          </p>

          <span className="plans-state-sub">
            Plans will appear here once the admin
            publishes them.
          </span>
        </div>
      </div>
    );
  }

  /* ─────────── Render ─────────── */

  return (
    <>
      <div className="plans-page">
        <header className="plans-header">
          <h1 className="plans-title">
            <FiAward /> Plans &amp; Pricing
          </h1>

          <p className="plans-subtitle">
            Choose the plan that matches your
            business.
          </p>
        </header>

        <div className="plans-grid">
          {plans.map((plan: PlanForMe) => {
            const isFreePlan =
              Number(plan.price) === 0;

            let isCurrent = false;
            let ctaLabel = 'Upgrade';
            let ctaDisabled = false;

            /*
             * ─────────────────────────────────────
             * CASE 1: USER IS ON FREE PLAN
             * ─────────────────────────────────────
             *
             * Free is the current plan.
             *
             * Paid plans can be purchased.
             */

            if (isFreeSubscription) {
              if (isFreePlan) {
                isCurrent = true;

                ctaLabel = 'Current Plan';

                ctaDisabled = true;
              } else {
                isCurrent = false;

                ctaLabel = 'Upgrade';

                ctaDisabled = false;
              }
            }

            /*
             * ─────────────────────────────────────
             * CASE 2: ACTIVE PAID SUBSCRIPTION
             * ─────────────────────────────────────
             *
             * The user cannot change plans while
             * their current paid subscription is
             * still active.
             *
             * ALL plans are disabled.
             */

            else if (isActivePaidSubscription) {
              if (plan.is_current) {
                isCurrent = true;

                ctaLabel = 'Current Plan';
              } else {
                isCurrent = false;

                ctaLabel = 'Not Available';
              }

              ctaDisabled = true;
            }

            /*
             * ─────────────────────────────────────
             * CASE 3: PAID SUBSCRIPTION EXPIRED
             * ─────────────────────────────────────
             *
             * Free is NEVER available.
             *
             * Every paid plan can be purchased.
             */

            else if (isExpiredPaidSubscription) {
              if (isFreePlan) {
                isCurrent = false;

                ctaLabel = 'Not Available';

                ctaDisabled = true;
              } else {
                isCurrent = false;

                ctaLabel = 'Upgrade';

                ctaDisabled = false;
              }
            }

            /*
             * ─────────────────────────────────────
             * CASE 4: NO SUBSCRIPTION
             * ─────────────────────────────────────
             *
             * Normally this should only occur
             * before the account's Free subscription
             * has been created.
             */

            else {
              if (isFreePlan) {
                ctaLabel = 'Get Started';

                ctaDisabled = false;
              } else {
                ctaLabel = 'Upgrade';

                ctaDisabled = false;
              }
            }

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isPopular={false}
                isCurrent={isCurrent}
                ctaLabel={ctaLabel}
                ctaDisabled={ctaDisabled}
                onUpgrade={handleUpgrade}
              />
            );
          })}
        </div>
      </div>

      {/* ─────────── Purchase Sheet ─────────── */}

      <PlanPurchaseSheet
        open={sheetOpen}
        plan={sheetPlan}
        onClose={() => {
          setSheetOpen(false);
          setSheetPlan(null);
        }}
      />
    </>
  );
};

export default Plans;