// src/pages/accounts/api/plansApi.ts

import { useAuthStore } from '../../../../store/authStore';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   TYPES
   ============================================================ */

export type BillingCycle = 'free' | 'monthly' | 'yearly' | 'lifetime';

export type PlanProperty = {
  id: number;
  name: string;
  value: string;
  is_highlighted: boolean;
  sort_order: number;
};

export type Plan = {
  id: number;
  plan_name: string;
  slug: string;
  description: string;
  price: string;
  price_display: string;
  is_free: boolean;
  billing_cycle: BillingCycle;

  businesses_limit: number | null;
  posts_limit: number | null;
  products_limit: number | null;
  images_per_product: number | null;
  stories_per_month: number | null;
  profile_images_limit: number;

  featured_listing: boolean;
  verified_premium_badge: boolean;
  priority_visibility: boolean;

  analytics_level: 'none' | 'basic' | 'advanced';
  connection_fee_type: 'normal' | 'reduced' | 'waived';

  is_active: boolean;
  is_default: boolean;
  display_order: number;

  created_at: string;
  updated_at: string;

  properties: PlanProperty[];
};

export type PlansListResponse = {
  count: number;
  results: Plan[];
};

export type PlanCreatePayload = {
  plan_name: string;
  slug: string;
  description?: string;
  price?: string | number;
  billing_cycle?: BillingCycle;

  businesses_limit?: number | null;
  posts_limit?: number | null;
  products_limit?: number | null;
  images_per_product?: number | null;
  stories_per_month?: number | null;
  profile_images_limit?: number;

  analytics_level?: 'none' | 'basic' | 'advanced';
  connection_fee_type?: 'normal' | 'reduced' | 'waived';

  is_active?: boolean;
  display_order?: number;
};

export type PlanCreateResponse = {
  message: string;
  plan: Plan;
  was_first_plan?: boolean;
};

export type PlanMutationResponse = {
  message: string;
  plan: Plan;
};

export type PlanDeleteResponse = {
  message: string;
  subscription_count?: number;
};

/* ============================================================
   AUTH HEADERS
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
   LIST ALL — GET /plans/admin/all/
   ============================================================ */

export async function fetchAllPlans(): Promise<Plan[]> {
  const res = await fetch(`${API_BASE}/plans/admin/all/`, {
    method: 'GET',
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(extractError(data, 'Failed to load plans.'));
  }

  return (data as PlansListResponse).results ?? [];
}

/* ============================================================
   CREATE — POST /plans/create/
   ============================================================ */

export async function createPlan(
  payload: PlanCreatePayload,
): Promise<PlanCreateResponse> {
  const res = await fetch(`${API_BASE}/plans/create/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(extractError(data, 'Failed to create plan.'));
  }

  return data as PlanCreateResponse;
}

/* ============================================================
   UPDATE — PATCH /plans/<slug>/update/
   ============================================================ */

export async function updatePlan(
  slug: string,
  payload: Partial<PlanCreatePayload>,
): Promise<PlanMutationResponse> {
  const res = await fetch(`${API_BASE}/plans/${slug}/update/`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(extractError(data, 'Failed to update plan.'));
  }

  return data as PlanMutationResponse;
}

/* ============================================================
   DELETE — DELETE /plans/<slug>/delete/
   ============================================================ */

export async function deletePlan(
  slug: string,
): Promise<PlanDeleteResponse> {
  const res = await fetch(`${API_BASE}/plans/${slug}/delete/`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(extractError(data, 'Failed to delete plan.'));
  }

  return (data ?? { message: 'Plan deleted.' }) as PlanDeleteResponse;
}

/* ============================================================
   SET DEFAULT — POST /plans/<slug>/set-default/
   ============================================================ */

export async function setDefaultPlan(
  slug: string,
): Promise<PlanMutationResponse> {
  const res = await fetch(`${API_BASE}/plans/${slug}/set-default/`, {
    method: 'POST',
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(extractError(data, 'Failed to set default plan.'));
  }

  return data as PlanMutationResponse;
}

/* ============================================================
   CLEAR DEFAULT — POST /plans/<slug>/clear-default/
   ============================================================ */

export async function clearDefaultPlan(
  slug: string,
): Promise<PlanMutationResponse> {
  const res = await fetch(`${API_BASE}/plans/${slug}/clear-default/`, {
    method: 'POST',
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(extractError(data, 'Failed to clear default.'));
  }

  return data as PlanMutationResponse;
}