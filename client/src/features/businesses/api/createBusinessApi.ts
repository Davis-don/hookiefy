// src/features/businesses/api/createBusinessApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type BusinessCategory = 'goods' | 'services';

export type CreateBusinessPayload = {
  businessName: string;
  businessCategory: BusinessCategory;
  businessType: string;
  description: string;
  county: string;
  cityTown: string;
  region: string;
};

export type CreateBusinessResponse = {
  message: string;
  business: {
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
    created_at: string;
    updated_at: string;
  };
};

export async function createBusiness(
  token: string | null,
  payload: CreateBusinessPayload
): Promise<CreateBusinessResponse> {
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(`${API_BASE}/businesses/create/`, {
    method: 'POST',
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
    }),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    let message = 'Could not create your business.';
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
          };
          message = `${labels[firstKey] || firstKey}: ${first}`;
        }
      }
    }
    throw new Error(message);
  }

  return data as CreateBusinessResponse;
}