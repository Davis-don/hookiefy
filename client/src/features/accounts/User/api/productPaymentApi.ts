// src/components/feed/productPaymentApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   TYPES
   ============================================================ */

export type ProductPayment = {
  id: string;
  merchant_reference: string;
  order_tracking_id: string | null;
  gateway: string;
  status:
    | 'pending'
    | 'completed'
    | 'failed'
    | 'reversed'
    | 'invalid'
    | 'cancelled';
  amount: string;
  amount_display: string;
  currency: string;
  quantity: number;
  town: string | null;            // ← added
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

export type InitiateProductPaymentResponse = {
  message: string;
  payment: ProductPayment;
  redirect_url: string;
};

/* ============================================================
   INPUT — INITIATE PAYLOAD
   ============================================================ */

/**
 * The two fields the client supplies to initiate a product
 * payment. Everything else (product, user, price, quantity)
 * is derived by the backend.
 *
 *  - town:  required, delivery destination
 *  - phone: optional, contact override for PesaPal
 */
export type InitiateProductPaymentPayload = {
  town: string;
  phone?: string;
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
   INITIATE — POST /product_payments/initiate/
   ============================================================ */

export async function initiateProductPayment(
  token: string | null,
  productId: number,
  payload: InitiateProductPaymentPayload,
): Promise<InitiateProductPaymentResponse> {
  const res = await fetch(`${API_BASE}/product_payments/initiate/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      product_id: productId,
      town: payload.town,
      phone: payload.phone || '',
    }),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not start the payment.'));
  }

  return (await res.json()) as InitiateProductPaymentResponse;
}

/* ============================================================
   STATUS — GET /product_payments/<ref>/status/
   ============================================================ */

export async function fetchProductPaymentStatus(
  token: string | null,
  merchantReference: string,
): Promise<ProductPayment> {
  const res = await fetch(
    `${API_BASE}/product_payments/${encodeURIComponent(merchantReference)}/status/`,
    { headers: authHeaders(token) },
  );

  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not load the payment.'));
  }

  return (await res.json()) as ProductPayment;
}

/* ============================================================
   SYNC — POST /product_payments/<ref>/sync/
   ============================================================ */

export async function syncProductPayment(
  token: string | null,
  merchantReference: string,
): Promise<ProductPayment> {
  const res = await fetch(
    `${API_BASE}/product_payments/${encodeURIComponent(merchantReference)}/sync/`,
    {
      method: 'POST',
      headers: authHeaders(token),
    },
  );

  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not sync the payment.'));
  }

  const data = await res.json();
  return data.payment as ProductPayment;
}

/* ============================================================
   FETCH PRODUCT (for price)
   ============================================================ */

export type ProductPriceInfo = {
  id: number;
  name: string;
  price: string | null;
  business: number;
  business_name: string;
};

export async function fetchProductPrice(
  token: string | null,
  productId: number,
): Promise<ProductPriceInfo> {
  const res = await fetch(`${API_BASE}/products/${productId}/`, {
    headers: authHeaders(token),
  });

  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not load the product.'));
  }

  return (await res.json()) as ProductPriceInfo;
}