// src/pages/accounts/User/api/billingApi.ts

import { useAuthStore } from '../../../../store/authStore';
import type { Plan } from './plansApi';

// Re-export so files can import Plan from either path.
export type { Plan };

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   TYPES
   ============================================================ */

export type Subscription = {
  id: number;
  plan: Plan;
  plan_name: string;
  status: string;
  effective_status: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  is_expired: boolean;
  is_expiring_soon: boolean;
  days_remaining: number | null;
  months_remaining: number | null;
  duration_display: string;
  auto_renew: boolean;
  payment_reference: string | null;
  created_at: string;
  updated_at: string;
};

export type CurrentSubscriptionResponse = {
  subscription: Subscription | null;
  effective_plan: Plan | null;
  has_active_subscription: boolean;
};

/* ============================================================
   HEADERS
   ============================================================ */

function authHeaders(): HeadersInit {
  const access = useAuthStore.getState().access;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (access) headers.Authorization = `Bearer ${access}`;
  return headers;
}

/* ============================================================
   HELPERS
   ============================================================ */

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function extractError(data: any, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === 'string') return data;

  if (typeof data === 'object') {
    if (typeof data.message === 'string') return data.message;
    if (typeof data.detail === 'string') return data.detail;

    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      const first = Array.isArray(val) ? val[0] : String(val);
      return `${firstKey}: ${first}`;
    }
  }
  return fallback;
}

/* ============================================================
   FETCH CURRENT — GET /subscription/current/
   ============================================================ */

export async function fetchCurrentSubscription(): Promise<CurrentSubscriptionResponse> {
  const res = await fetch(`${API_BASE}/subscription/current/`, {
    method: 'GET',
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractError(data, 'Failed to load your subscription.'),
    );
  }

  return data as CurrentSubscriptionResponse;
}

/* ============================================================
   SUBSCRIPTION PAYMENT
   ============================================================ */

export type SubscriptionPayment = {
  id: string;
  merchant_reference: string;
  order_tracking_id: string | null;
  gateway: 'pesapal' | 'paystack' | 'mpesa';
  status:
    | 'pending'
    | 'completed'
    | 'failed'
    | 'reversed'
    | 'invalid'
    | 'cancelled';
  amount: string;
  currency: string;
  phone_number: string | null;
  email: string | null;
  plan: number | null;
  plan_name: string | null;
  plan_slug: string | null;
  confirmation_code: string | null;
  payment_method: string | null;
  payment_account: string | null;
  error_message: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InitiatePaymentResponse = {
  message: string;
  payment: SubscriptionPayment;
  redirect_url: string;
};

/**
 * Start a PesaPal payment for a plan.
 */
export async function initiatePayment(
  planSlug: string,
  phone?: string,
): Promise<InitiatePaymentResponse> {
  const res = await fetch(`${API_BASE}/subscription_payments/initiate/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      plan_slug: planSlug,
      phone: phone ?? '',
    }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractError(data, 'Could not start the payment.'),
    );
  }

  return data as InitiatePaymentResponse;
}

/**
 * Poll the local payment row for its current status.
 */
export async function fetchPaymentStatus(
  merchantReference: string,
): Promise<SubscriptionPayment> {
  const res = await fetch(
    `${API_BASE}/subscription_payments/${merchantReference}/status/`,
    {
      method: 'GET',
      headers: authHeaders(),
    },
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractError(data, 'Could not load payment status.'),
    );
  }

  return data as SubscriptionPayment;
}

export type SyncPaymentResponse = {
  message: string;
  payment: SubscriptionPayment;
  detail?: string;
};

export async function syncPayment(
  merchantReference: string,
): Promise<SyncPaymentResponse> {
  const res = await fetch(
    `${API_BASE}/subscription_payments/${merchantReference}/sync/`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractError(data, 'Could not verify the payment.'),
    );
  }

  return data as SyncPaymentResponse;
}

/* ============================================================
   DOWNGRADE PRE-CHECK — POST /subscription/pre-check-downgrade/
   ============================================================ */

export type PlanOverflow = {
  businesses: number;
  posts: number;
  products: number;
  images: number;
};

export type DowngradePreCheckResponse = {
  ok: boolean;
  target_plan_slug: string;
  target_plan_name: string;
  usage: PlanOverflow;
  limits: PlanOverflow;
  overflow: PlanOverflow;
  total_overflow: number;
  confirmation_token: string | null;
  message: string;
  requires_confirmation: boolean;
  prune_summary?: {
    deleted: PlanOverflow;
    images_cloudinary_deleted: number;
    images_cloudinary_failed: number;
  };
};

/**
 * Audit a plan downgrade.
 *
 * - Called WITHOUT a token → returns the audit.
 *     - 200 = content fits, safe to pay.
 *     - 409 = overflow; must confirm before paying.
 * - Called WITH a token → verifies the token, prunes overflow,
 *     and returns 200. On stale token, returns 409 again.
 *
 * Non-409 failures throw, so the caller can show a plain error.
 */
export async function preCheckDowngrade(
  planSlug: string,
  confirmationToken?: string,
): Promise<DowngradePreCheckResponse> {
  const res = await fetch(
    `${API_BASE}/subscription/pre-check-downgrade/`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        plan_slug: planSlug,
        ...(confirmationToken
          ? { confirmation_token: confirmationToken }
          : {}),
      }),
    },
  );

  const data = await parseJsonSafe(res);

  // 409 carries structured data — return it, don't throw
  if (res.status === 409) {
    return data as DowngradePreCheckResponse;
  }

  if (!res.ok) {
    throw new Error(
      extractError(data, 'Could not check plan downgrade.'),
    );
  }

  return data as DowngradePreCheckResponse;
}