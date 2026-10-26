// src/features/accounts/User/api/deliveriesApi.ts

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

export type Delivery = {
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

  delivered_to_id: number | null;
  delivered_to_email: string | null;

  town: string;
  status: DeliveryStatus;
  delivered_at: string | null;

  is_terminal: boolean;
  time_since_created: string;

  created_at: string;
  updated_at: string;
};

export type DeliveryListResponse = {
  count: number;
  results: Delivery[];
};

export type FetchDeliveriesOptions = {
  /** Filter by delivery state. */
  status?: DeliveryStatus;
  /**
   * Filter by the caller's relationship to the delivery:
   *   client    → they placed the order
   *   courier   → they're delivering it
   *   recipient → it's addressed to them
   */
  role?: 'client' | 'courier' | 'recipient';
  /** Filter by destination town (case-insensitive). */
  town?: string;
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
   LIST — GET /deliveries/
   ============================================================ */

/**
 * Fetch every delivery the current user is involved in —
 * as the client who ordered it, the courier handling it, or
 * the recipient receiving it.
 *
 * The backend returns one row per delivery regardless of how
 * many roles the user has on it — a delivery where the user
 * is both client and recipient appears once, not twice.
 *
 * Filter options narrow the result without extra endpoints:
 *   ?status=pending          → only pending
 *   ?role=client             → only as buyer
 *   ?town=Nairobi            → only to that town
 *   ?status=pending&role=courier → combined
 */
export async function fetchMyDeliveries(
  token: string | null,
  options: FetchDeliveriesOptions = {},
): Promise<Delivery[]> {
  if (!token) return [];

  const params = new URLSearchParams();

  if (options.status) params.set('status', options.status);
  if (options.role) params.set('role', options.role);
  if (options.town) params.set('town', options.town);

  const qs = params.toString();
  const url = `${API_BASE}/deliveries/${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, { headers: authHeaders(token) });

  if (!res.ok) {
    throw new Error(
      await parseError(res, 'Could not load your deliveries.'),
    );
  }

  const data: DeliveryListResponse | Delivery[] = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}