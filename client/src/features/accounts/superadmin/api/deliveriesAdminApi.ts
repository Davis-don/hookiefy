// src/features/accounts/Super/api/deliveriesAdminApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   TYPES
   ============================================================ */

export type DeliveryStatus =
  | 'pending'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export type AccountSummary = {
  id: number;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: 'superadmin' | 'user';
  is_active: boolean;
  is_youpata_managed: boolean;
  profile_image_url: string | null;
};

export type AdminDelivery = {
  id: string;
  payment: string;
  payment_reference: string;

  client_id: number;
  client_email: string;
  client_name: string;

  product_id: number | null;
  product_name: string | null;
  product_image_url: string | null;
  quantity: number;

  delivered_by_id: number | null;
  delivered_by_email: string | null;
  delivered_by_is_youpata_managed: boolean | null;

  delivered_to_id: number | null;
  delivered_to_email: string | null;

  town: string;
  status: DeliveryStatus;
  delivered_at: string | null;

  is_terminal: boolean;
  time_since_created: string;

  created_at: string;
  updated_at: string;

  // Only populated by the detail endpoint
  buyer?: AccountSummary | null;
  courier?: AccountSummary | null;
  recipient?: AccountSummary | null;
  business?: AccountSummary | null;
};

export type AdminDeliveryPage = {
  count: number;
  next_cursor: string | null;
  has_more: boolean;
  results: AdminDelivery[];
};

export type FetchAllDeliveriesOptions = {
  status?: DeliveryStatus;
  town?: string;
  business?: number;
  delivered_by?: number;
  limit?: number;
  before?: string;
};

/* ============================================================
   HELPERS
   ============================================================ */

async function parseError(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

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

function authHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/* ============================================================
   LIST — GET /deliveries/all/
   ============================================================ */

export async function fetchAllDeliveries(
  token: string | null,
  options: FetchAllDeliveriesOptions = {},
): Promise<AdminDeliveryPage> {
  if (!token) {
    return { count: 0, next_cursor: null, has_more: false, results: [] };
  }

  const params = new URLSearchParams();

  if (options.status) params.set('status', options.status);
  if (options.town) params.set('town', options.town);
  if (options.business != null) {
    params.set('business', String(options.business));
  }
  if (options.delivered_by != null) {
    params.set('delivered_by', String(options.delivered_by));
  }
  if (options.limit != null) params.set('limit', String(options.limit));
  if (options.before) params.set('before', options.before);

  const qs = params.toString();
  const url = `${API_BASE}/deliveries/all/${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, { headers: authHeaders(token) });

  if (!res.ok) {
    throw new Error(
      await parseError(res, 'Could not load deliveries.'),
    );
  }

  return (await res.json()) as AdminDeliveryPage;
}

/* ============================================================
   DETAIL — GET /deliveries/all/<id>/
   ============================================================ */

export async function fetchAllDeliveryDetail(
  token: string | null,
  id: string,
): Promise<AdminDelivery> {
  if (!token) throw new Error('Authentication required.');

  const url = `${API_BASE}/deliveries/all/${id}/`;
  const res = await fetch(url, { headers: authHeaders(token) });

  if (!res.ok) {
    throw new Error(
      await parseError(res, 'Could not load this delivery.'),
    );
  }

  return (await res.json()) as AdminDelivery;
}
/* ============================================================
   UPDATE STATUS — PATCH /deliveries/all/<id>/status/
   ============================================================ */

export type DeliveryStatusUpdatePayload = {
  status: DeliveryStatus;
};

export async function updateAllDeliveryStatus(
  token: string | null,
  id: string,
  payload: DeliveryStatusUpdatePayload,
): Promise<AdminDelivery> {
  if (!token) throw new Error('Authentication required.');

  const url = `${API_BASE}/deliveries/all/${id}/status/`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      await parseError(res, 'Could not update delivery status.'),
    );
  }

  return (await res.json()) as AdminDelivery;
}