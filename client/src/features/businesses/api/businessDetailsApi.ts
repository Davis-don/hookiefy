// src/features/business/api/businessDetailsApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================
// TYPES
// ============================================================

export type BusinessProductImage = {
  id: number;
  image_url: string;
  image_public_id: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
};

export type BusinessProductProperty = {
  id: number;
  name: string;
  value: string;
  sort_order: number;
};

export type BusinessProduct = {
  id: number;
  name: string;
  description: string;
  price: string | null;
  views: number;
  images: BusinessProductImage[];
  primary_image: BusinessProductImage | null;
  properties: BusinessProductProperty[];
  created_at: string;
  updated_at: string;
};

export type BusinessPost = {
  id: number;
  title: string;
  body: string;
  image_url: string;
  image_public_id: string;
  views: number;
  created_at: string;
  updated_at: string;
};

export type BusinessFull = {
  id: number;
  business_name: string;
  business_category: 'goods' | 'services';
  business_category_display: string;
  business_type: string;
  description: string;
  county: string;
  city_town: string;
  region: string;
  status: string;
  status_display: string;

  post_count: number;
  product_count: number;

  posts: BusinessPost[];
  products: BusinessProduct[];

  created_at: string;
  updated_at: string;
};

export type BusinessDetailsResponse = {
  business: BusinessFull;
};

// ============================================================
// HELPERS
// ============================================================

async function parseError(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (data && typeof data === 'object') {
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

// ============================================================
// FETCH — GET /businesses/<id>/details/
// ============================================================

export async function fetchBusinessDetails(
  token: string | null,
  businessId: number
): Promise<BusinessDetailsResponse> {
  if (!token) throw new Error('Not authenticated.');

  const url = `${API_BASE}/businesses/${businessId}/details/`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(
      await parseError(res, 'Could not load this business.')
    );
  }

  return (await res.json()) as BusinessDetailsResponse;
}