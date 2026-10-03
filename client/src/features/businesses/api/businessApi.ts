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
// Append to src/features/businesses/api/businessApi.ts

export type UpdateBusinessPayload = {
  businessName: string;
  businessCategory: BusinessCategory;
  businessType: string;
  description: string;
  county: string;
  cityTown: string;
  region: string;
  status?: BusinessStatus;
};

export async function updateBusiness(
  token: string | null,
  businessId: number,
  payload: UpdateBusinessPayload
): Promise<{ message: string; business: Business }> {
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(`${API_BASE}/businesses/${businessId}/update/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      business_name: payload.businessName,
      business_category: payload.businessCategory,
      business_type: payload.businessType,
      description: payload.description,
      county: payload.county,
      city_town: payload.cityTown,
      region: payload.region,
      ...(payload.status ? { status: payload.status } : {}),
    }),
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let message = 'Could not update this business.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
      else {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          const val = data[firstKey];
          const first = Array.isArray(val) ? val[0] : String(val);
          const labels: Record<string, string> = {
            business_name: 'Business name',
            business_category: 'Category',
            business_type: 'Business type',
            description: 'Description',
            county: 'County',
            city_town: 'City / town',
            region: 'Region',
            status: 'Status',
          };
          message = `${labels[firstKey] || firstKey}: ${first}`;
        }
      }
    }
    throw new Error(message);
  }

  return data as { message: string; business: Business };
}
// Append to src/features/businesses/api/businessApi.ts

export async function deleteBusiness(
  token: string | null,
  businessId: number
): Promise<{ message: string }> {
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(`${API_BASE}/businesses/${businessId}/delete/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let message = 'Could not delete this business.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
    }
    throw new Error(message);
  }

  return (data ?? { message: 'Business deleted.' }) as { message: string };
}