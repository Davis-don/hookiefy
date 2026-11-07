// src/features/order/api/orderApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   TYPES
   ============================================================ */

export type OrderRow = {
  id: string;
  merchant_reference: string;
  order_tracking_id: string | null;
  gateway: string;
  status: string;

  amount: string;
  amount_display: string;
  currency: string;

  quantity: number;
  town: string | null;

  product: number | null;
  product_name: string | null;

  business: number | null;
  business_name: string | null;

  phone_number: string | null;
  email: string | null;

  confirmation_code: string | null;
  payment_method: string | null;
  payment_account: string | null;

  error_message: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: OrderRow[];
};

export type UserLookup = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string | null;
  profile_image_url: string | null;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_login: string | null;
};

export type ProductLookup = {
  id: number;
  name: string;
  price: string | null;
  quantity: number;
  in_stock: boolean;
  business: number;
  business_name: string;
  owner_email: string | null;
  primary_image_url: string | null;
};

export type ManualGateway =
  | 'manual_cash'
  | 'manual_cheque'
  | 'manual_bank'
  | 'manual_other';

export type CreateManualPaymentInput = {
  product_id: number;
  user_email: string | null;
  quantity: number;
  amount: string;
  currency: string;
  town: string;
  gateway: ManualGateway;
  phone_number?: string;
  note?: string;
};

export type CreatedPayment = {
  id: string;
  merchant_reference: string;
  product: number | null;
  product_name: string | null;
  business: number | null;
  business_name: string | null;
  quantity: number;
  town: string | null;
  email: string | null;
  phone_number: string | null;
  amount: string;
  currency: string;
  gateway: string;
  status: string;
};

export type CreateDeliveryInput = {
  product: number;
  business: number | null;
  town: string;
  quantity: number;
  status: 'pending' | 'delivered' | 'failed';
  notes?: string;
  payment_reference?: string;
};

/* ============================================================
   ERROR HELPER
   ============================================================ */

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

function authHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/* ============================================================
   ORDERS LIST
   ============================================================ */

export async function fetchOrders(
  token: string | null,
  params: {
    page?: number;
    pageSize?: number;
    status?: string;
    gateway?: string;
    search?: string;
  } = {},
): Promise<OrderListResponse> {
  const p = new URLSearchParams();
  if (params.status) p.set('status', params.status);
  if (params.gateway) p.set('gateway', params.gateway);
  if (params.search) p.set('search', params.search);
  p.set('page', String(params.page ?? 1));
  p.set('page_size', String(params.pageSize ?? 20));

  const res = await fetch(
    `${API_BASE}/product_payments/?${p.toString()}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load orders.'));
  return (await res.json()) as OrderListResponse;
}

/* ============================================================
   LOOKUPS (superadmin only)
   ============================================================ */

export async function lookupUserByEmail(
  token: string | null,
  email: string,
): Promise<UserLookup> {
  const res = await fetch(
    `${API_BASE}/account/users/by-email/?email=${encodeURIComponent(email)}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(await parseError(res, 'User not found.'));
  return (await res.json()) as UserLookup;
}

export async function lookupProductById(
  token: string | null,
  productId: number | string,
): Promise<ProductLookup> {
  const res = await fetch(
    `${API_BASE}/products/${encodeURIComponent(String(productId))}/lookup/`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(await parseError(res, 'Product not found.'));
  return (await res.json()) as ProductLookup;
}

/* ============================================================
   MANUAL PAYMENT (superadmin only)
   ============================================================ */

export async function createManualPayment(
  token: string | null,
  input: CreateManualPaymentInput,
): Promise<{ payment: CreatedPayment; stock_warning?: string | null }> {
  const res = await fetch(`${API_BASE}/product_payments/manual/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not record payment.'));
  return await res.json();
}

/* ============================================================
   DELIVERY
   ============================================================ */

export async function createDelivery(
  token: string | null,
  input: CreateDeliveryInput,
): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/deliveries/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Could not create delivery.'));
  return await res.json();
}