// src/pages/accounts/User/api/plansApi.ts

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
   PUBLIC LIST — GET /plans/
   Active plans only. No auth required, but we send it anyway.
   ============================================================ */

export async function fetchAllPlans(): Promise<Plan[]> {
  const res = await fetch(`${API_BASE}/plans/`, {
    method: 'GET',
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    // If the endpoint returned 403 (auth issue) or 500, throw
    // so React Query surfaces the error to the UI.
    throw new Error(extractError(data, 'Failed to load plans.'));
  }

  // The public endpoint returns a bare array. Handle that
  // shape first.
  if (Array.isArray(data)) {
    return data as Plan[];
  }

  // Fallback for the wrapped envelope, in case the view
  // ever changes to return { count, results }.
  if (data && Array.isArray((data as PlansListResponse).results)) {
    return (data as PlansListResponse).results;
  }

  return [];
}