// pages/Plans.tsx
import { useMemo, useState } from 'react';
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

interface SubscriptionPlanRef {
  id: number;
  name: string;
  slug: string;
  price: string;
}

interface SubscriptionStatusResponse {
  has_subscription: boolean;
  is_free: boolean;
  is_premium: boolean;
  is_active: boolean;
  is_expired: boolean;
  status: 'active' | 'expired' | 'free' | 'no_subscription';
  plan: SubscriptionPlanRef | null;
  start_date: string | null;
  end_date: string | null;
  time_remaining: unknown;
  elapsed_since_expiry: unknown;
  role: string;
}

/* ─────────── API ─────────── */

function resolveApiOrigin(): string {
  // @ts-ignore
  const envUrl: string | undefined = import.meta.env?.VITE_API_URL;
  if (!envUrl || !envUrl.trim()) return '';
  return envUrl.replace(/\/+$/, '');
}

const API_ORIGIN = resolveApiOrigin();

async function fetchPlans(): Promise<Plan[]> {
  const url = API_ORIGIN
    ? `${API_ORIGIN}/plans/?active=true`
    : `/plans/?active=true`;

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const contentType = res.headers.get('content-type') || '';
  const raw = await res.text().catch(() => '');

  if (!res.ok) {
    throw new Error(
      `Failed to load plans (${res.status}). ${raw.slice(0, 120)}`
    );
  }

  if (!contentType.includes('application/json')) {
    throw new Error(
      `Expected JSON from ${url}, got "${contentType}".`
    );
  }

  const data = JSON.parse(raw);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.plans)) return data.plans;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

async function fetchSubscriptionStatus(
  access: string
): Promise<SubscriptionStatusResponse | null> {
  const url = API_ORIGIN
    ? `${API_ORIGIN}/subscription/status/`
    : `/subscription/status/`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${access}`,
    },
  });

  if (!res.ok) return null;
  return res.json();
}

/* ─────────── Page ─────────── */

const Plans = () => {
  const { access } = useAuthStore();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPlan, setSheetPlan] = useState<Plan | null>(null);

  /* ── Plans ────────────────────────────────── */
  const {
    data: plans = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Plan[], Error>({
    queryKey: ['plans'],
    queryFn: fetchPlans,
    staleTime: 5 * 60_000,
    enabled: true,
  });

  /* ── Subscription ─────────────────────────── */
  const { data: subscription } = useQuery<
    SubscriptionStatusResponse | null,
    Error
  >({
    queryKey: ['subscription-status', access],
    queryFn: () => {
      if (!access) return Promise.resolve(null);
      return fetchSubscriptionStatus(access);
    },
    enabled: !!access,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const errorMessage = error?.message ?? null;

  const currentPlanId = useMemo(() => {
    return subscription?.plan?.id ?? null;
  }, [subscription]);

  const isOnFreePlan = useMemo(() => {
    if (!subscription) return false;
    if (subscription.is_free) return true;
    if (!subscription.has_subscription) return true;
    return false;
  }, [subscription]);

  const hasActivePaidPlan = useMemo(() => {
    if (!subscription) return false;
    return subscription.is_active && !subscription.is_free;
  }, [subscription]);

  const popularPlanId = useMemo(() => {
    const paid = plans
      .filter((p) => Number(p.price) > 0)
      .sort((a, b) => Number(a.price) - Number(b.price));

    if (paid.length === 0) return null;
    if (paid.length === 1) return paid[0].id;
    return paid[Math.floor(paid.length / 2)].id;
  }, [plans]);

  const getPlanCtaState = (plan: Plan) => {
    const isCurrent = plan.id === currentPlanId;
    const isFreePlan = Number(plan.price) === 0;

    if (isCurrent) {
      return { label: 'Current Plan', disabled: true };
    }

    if (isFreePlan) {
      if (hasActivePaidPlan) {
        return { label: 'Cannot downgrade', disabled: true };
      }
      return { label: 'Get Started', disabled: false };
    }

    if (!subscription?.has_subscription || subscription.is_expired) {
      return { label: 'Upgrade', disabled: false };
    }

    if (isOnFreePlan) {
      return { label: 'Upgrade', disabled: false };
    }

    return { label: 'Switch Plan', disabled: false };
  };

  /* ── Open the sheet ──────────────────────── */
  const handleUpgrade = (plan: Plan) => {
    if (!access) {
      alert('Please sign in again.');
      return;
    }
    setSheetPlan(plan);
    setSheetOpen(true);
  };

 

  /* ── Loading ─────────────────────────────── */
  if (isLoading && plans.length === 0) {
    return (
      <div className="plans-page">
        <header className="plans-header">
          <h1 className="plans-title">
            <FiAward /> Plans &amp; Pricing
          </h1>
        </header>
        <div className="plans-state">
          <FiLoader className="plans-spin" />
          <p>Loading plans…</p>
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────── */
  if (isError && plans.length === 0) {
    return (
      <div className="plans-page">
        <header className="plans-header">
          <h1 className="plans-title">
            <FiAward /> Plans &amp; Pricing
          </h1>
        </header>
        <div className="plans-state plans-state--error">
          <FiAlertCircle />
          <p>Couldn't load plans</p>
          <span className="plans-state-sub">{errorMessage}</span>
          <button
            type="button"
            className="plans-retry"
            onClick={() => refetch()}
          >
            <FiRefreshCw /> Retry
          </button>
        </div>
      </div>
    );
  }

  /* ── Empty ───────────────────────────────── */
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
          <p>No plans available</p>
          <span className="plans-state-sub">
            Plans will appear here once the admin publishes them.
          </span>
        </div>
      </div>
    );
  }

  /* ── Grid + sheet ────────────────────────── */
  return (
    <>
      <div className="plans-page">
        <header className="plans-header">
          <h1 className="plans-title">
            <FiAward /> Plans &amp; Pricing
          </h1>
          <p className="plans-subtitle">
            Choose the plan that matches your business.
          </p>
        </header>

        <div className="plans-grid">
          {plans.map((plan) => {
            const cta = getPlanCtaState(plan);
            const isCurrent = plan.id === currentPlanId;

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isPopular={plan.id === popularPlanId}
                isCurrent={isCurrent}
                ctaLabel={cta.label}
                ctaDisabled={cta.disabled}
                onUpgrade={handleUpgrade}
              />
            );
          })}
        </div>
      </div>

      <PlanPurchaseSheet
        open={sheetOpen}
        plan={sheetPlan}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
};

export default Plans;