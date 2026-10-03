// src/features/businesses/api/businessApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type BusinessStatus =
  | 'active'
  | 'paused'
  | 'draft'
  | 'closed'
  | 'suspended';

export type BusinessCategory = 'goods' | 'services';

export type Business = {
  id: number;
  owner: number;
  owner_email: string;
  owner_full_name: string;
  business_name: string;
  business_category: BusinessCategory;
  business_category_display: string;
  business_type: string;
  description: string;
  county: string;
  city_town: string;
  region: string;
  status: BusinessStatus;
  status_display: string;
  created_at: string;
  updated_at: string;
};

type ListResponse = {
  count: number;
  results: Business[];
};

// ── List the authenticated user's businesses ──────────────
export async function fetchMyBusinesses(
  token: string | null
): Promise<Business[]> {
  if (!token) return [];

  const res = await fetch(`${API_BASE}/businesses/mine/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error('Could not load your businesses.');

  const data: ListResponse | Business[] = await res.json();
  const list = Array.isArray(data) ? data : data.results ?? [];
  return list as Business[];
}

// ── Fetch a single business by id ────────────────────────
export async function fetchBusiness(
  token: string | null,
  businessId: number
): Promise<Business> {
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(`${API_BASE}/businesses/${businessId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    let message = 'Could not load that business.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
    }
    throw new Error(message);
  }

  return data as Business;
}