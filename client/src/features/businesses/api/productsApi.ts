// src/features/businesses/api/productsApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================
// TYPES
// ============================================================

export type ProductImage = {
  id: number;
  image_url: string;
  image_public_id: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
};

export type ProductProperty = {
  id?: number;
  name: string;
  value: string;
  sort_order?: number;
};

export type Product = {
  id: number;
  business: number;
  business_name: string;
  name: string;
  description: string;
  price: number | null;
  images: ProductImage[];
  primary_image: ProductImage | null;
  has_images: boolean;
  image_urls: string[];
  has_price: boolean;
  properties: ProductProperty[];
  has_properties: boolean;
  views: number;
  created_at: string;
  updated_at: string;
};

export type ProductPayload = {
  name: string;
  description: string;
  price: number | null;
  properties?: ProductProperty[];     // unlimited named properties
  imageFiles?: File[];                // multiple images
  replaceImages?: boolean;            // update only — wipe old images first
};

export type ProductListResponse = {
  count: number;
  results: Product[];
};

// ============================================================
// ERROR PARSER
// ============================================================

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

// ============================================================
// LIST PRODUCTS FOR A BUSINESS
// ============================================================

export async function fetchProducts(
  token: string | null,
  businessId: number
): Promise<Product[]> {
  if (!token) return [];

  const res = await fetch(
    `${API_BASE}/products/business/${businessId}/`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error(await parseError(res, 'Could not load products.'));

  const data: ProductListResponse | Product[] = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

// ============================================================
// FETCH A SINGLE PRODUCT
// ============================================================

export async function fetchProduct(
  token: string | null,
  productId: number
): Promise<Product> {
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(
    `${API_BASE}/products/${productId}/`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not load that product.'));
  }

  return (await res.json()) as Product;
}

// ============================================================
// CREATE A PRODUCT
// ============================================================

export async function createProduct(
  token: string | null,
  businessId: number,
  payload: ProductPayload
): Promise<{ message: string; product: Product }> {
  if (!token) throw new Error('Not authenticated.');

  const formData = new FormData();
  formData.append('name', payload.name);

  if (payload.description) {
    formData.append('description', payload.description);
  }

  if (payload.price !== null && payload.price !== undefined) {
    formData.append('price', String(payload.price));
  }

  // Properties — parallel arrays, only send filled ones
  (payload.properties ?? []).forEach((p) => {
    if (p.name?.trim() && p.value?.trim()) {
      formData.append('property_name', p.name.trim());
      formData.append('property_value', p.value.trim());
    }
  });

  // Multiple images
  (payload.imageFiles ?? []).forEach((file) => {
    formData.append('images', file);
  });

  const res = await fetch(
    `${API_BASE}/products/business/${businessId}/create/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Let the browser set Content-Type (multipart boundary)
      },
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not create the product.'));
  }

  return (await res.json()) as { message: string; product: Product };
}

// ============================================================
// UPDATE A PRODUCT
// ============================================================

export async function updateProduct(
  token: string | null,
  productId: number,
  payload: ProductPayload
): Promise<{ message: string; product: Product }> {
  if (!token) throw new Error('Not authenticated.');

  const formData = new FormData();
  formData.append('name', payload.name);

  if (payload.description !== undefined) {
    formData.append('description', payload.description);
  }

  if (payload.price !== null && payload.price !== undefined) {
    formData.append('price', String(payload.price));
  }

  // Properties — if provided, they replace ALL existing ones
  if (payload.properties) {
    payload.properties.forEach((p) => {
      if (p.name?.trim() && p.value?.trim()) {
        formData.append('property_name', p.name.trim());
        formData.append('property_value', p.value.trim());
      }
    });
  }

  // Images — appended by default, or replace if replaceImages is true
  if (payload.imageFiles && payload.imageFiles.length > 0) {
    payload.imageFiles.forEach((file) => {
      formData.append('images', file);
    });
    if (payload.replaceImages) {
      formData.append('replace_images', 'true');
    }
  }

  const res = await fetch(
    `${API_BASE}/products/${productId}/update/`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not update the product.'));
  }

  return (await res.json()) as { message: string; product: Product };
}

// ============================================================
// DELETE A PRODUCT
// ============================================================

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

  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not delete this product.'));
  }

  return (await res.json()) as { message: string };
}

// ============================================================
// DELETE A SINGLE PRODUCT IMAGE
// ============================================================

export async function deleteProductImage(
  token: string | null,
  imageId: number
): Promise<{ message: string }> {
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(
    `${API_BASE}/products/images/${imageId}/delete/`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not delete the image.'));
  }

  return (await res.json()) as { message: string };
}

// ============================================================
// SET PRIMARY PRODUCT IMAGE
// ============================================================

export async function setPrimaryProductImage(
  token: string | null,
  imageId: number
): Promise<{ message: string; product: Product }> {
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(
    `${API_BASE}/products/images/${imageId}/primary/`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not set the primary image.'));
  }

  return (await res.json()) as { message: string; product: Product };
}