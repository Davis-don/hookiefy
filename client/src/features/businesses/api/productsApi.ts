// src/features/businesses/api/productsApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type Product = {
  id: number;
  business: number;
  business_name: string;
  name: string;
  description: string;
  price: number | null;
  image_url: string | null;
  image_public_id: string | null;
  has_image: boolean;
  has_price: boolean;
  property1: string | null;
  property2: string | null;
  property3: string | null;
  property4: string | null;
  property5: string | null;
  properties: string[];
  has_properties: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductPayload = {
  name: string;
  description: string;
  price: number | null;
  property1?: string;
  property2?: string;
  property3?: string;
  property4?: string;
  property5?: string;
  imageFile?: File | null;
};

export type ProductListResponse = {
  count: number;
  results: Product[];
};

// ── List products for a business ────────────────────────
export async function fetchProducts(
  token: string | null,
  businessId: number
): Promise<Product[]> {
  if (!token) return [];

  const res = await fetch(
    `${API_BASE}/products/business/${businessId}/`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let message = 'Could not load products.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
    }
    throw new Error(message);
  }

  const list = Array.isArray(data) ? data : data.results ?? [];
  return list as Product[];
}

// ── Fetch a single product ─────────────────────────────
export async function fetchProduct(
  token: string | null,
  productId: number
): Promise<Product> {
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(
    `${API_BASE}/products/${productId}/`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let message = 'Could not load that product.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
    }
    throw new Error(message);
  }

  return data as Product;
}

// ── Create a product ────────────────────────────────────
export async function createProduct(
  token: string | null,
  businessId: number,
  payload: ProductPayload
): Promise<{ message: string; product: Product }> {
  if (!token) throw new Error('Not authenticated.');

  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('description', payload.description);

  if (payload.price !== null && payload.price !== undefined) {
    formData.append('price', String(payload.price));
  }

  // Optional property slots — only send the ones that are filled
  if (payload.property1?.trim()) formData.append('property1', payload.property1.trim());
  if (payload.property2?.trim()) formData.append('property2', payload.property2.trim());
  if (payload.property3?.trim()) formData.append('property3', payload.property3.trim());
  if (payload.property4?.trim()) formData.append('property4', payload.property4.trim());
  if (payload.property5?.trim()) formData.append('property5', payload.property5.trim());

  if (payload.imageFile) {
    formData.append('image', payload.imageFile);
  }

  const res = await fetch(
    `${API_BASE}/products/business/${businessId}/create/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Do NOT set Content-Type — the browser sets it with the boundary
      },
      body: formData,
    }
  );

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let message = 'Could not create the product.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
      else {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          message = `${firstKey}: ${data[firstKey][0]}`;
        }
      }
    }
    throw new Error(message);
  }

  return data as { message: string; product: Product };
}

// ── Update a product ────────────────────────────────────
export async function updateProduct(
  token: string | null,
  productId: number,
  payload: ProductPayload
): Promise<{ message: string; product: Product }> {
  if (!token) throw new Error('Not authenticated.');

  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('description', payload.description);

  if (payload.price !== null && payload.price !== undefined) {
    formData.append('price', String(payload.price));
  }

  if (payload.property1?.trim()) formData.append('property1', payload.property1.trim());
  if (payload.property2?.trim()) formData.append('property2', payload.property2.trim());
  if (payload.property3?.trim()) formData.append('property3', payload.property3.trim());
  if (payload.property4?.trim()) formData.append('property4', payload.property4.trim());
  if (payload.property5?.trim()) formData.append('property5', payload.property5.trim());

  if (payload.imageFile) {
    formData.append('image', payload.imageFile);
  }

  const res = await fetch(
    `${API_BASE}/products/${productId}/update/`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let message = 'Could not update the product.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
    }
    throw new Error(message);
  }

  return data as { message: string; product: Product };
}

// ── Delete a product ────────────────────────────────────
export async function deleteProduct(
  token: string | null,
  productId: number
): Promise<{ message: string }> {
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(
    `${API_BASE}/products/${productId}/delete/`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let message = 'Could not delete this product.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
    }
    throw new Error(message);
  }

  return (data ?? { message: 'Deleted.' }) as { message: string };
}