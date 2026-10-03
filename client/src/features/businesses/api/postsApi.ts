// src/features/businesses/api/postsApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type Post = {
  id: number;
  business: number;
  business_name: string;
  title: string;
  body: string;
  image_url: string | null;
  image_public_id: string | null;
  has_image: boolean;
  created_at: string;
  updated_at: string;
};

export type PostPayload = {
  title: string;
  body: string;
  imageFile?: File | null;
};

export type PostListResponse = {
  count: number;
  results: Post[];
};

// ── Create ───────────────────────────────────────────────
export async function createPost(
  token: string | null,
  businessId: number,
  payload: PostPayload
): Promise<{ message: string; post: Post }> {
  if (!token) throw new Error('Not authenticated.');

  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('body', payload.body);
  if (payload.imageFile) {
    formData.append('image', payload.imageFile);
  }

  const res = await fetch(
    `${API_BASE}/posts/business/${businessId}/create/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Do NOT set Content-Type — the browser sets it with the boundary
      },
      body: formData,
    }
  );

  return handleResponse(res);
}

// ── List ────────────────────────────────────────────────
export async function fetchPosts(
  token: string | null,
  businessId: number
): Promise<Post[]> {
  if (!token) return [];

  const res = await fetch(`${API_BASE}/posts/business/${businessId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let message = 'Could not load posts.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
    }
    throw new Error(message);
  }

  const list = Array.isArray(data) ? data : data.results ?? [];
  return list as Post[];
}

// ── Update ──────────────────────────────────────────────
export async function updatePost(
  token: string | null,
  postId: number,
  payload: PostPayload
): Promise<{ message: string; post: Post }> {
  if (!token) throw new Error('Not authenticated.');

  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('body', payload.body);
  if (payload.imageFile) {
    formData.append('image', payload.imageFile);
  }

  const res = await fetch(`${API_BASE}/posts/${postId}/update/`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  return handleResponse(res);
}

// ── Delete ──────────────────────────────────────────────
export async function deletePost(
  token: string | null,
  postId: number
): Promise<{ message: string }> {
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(`${API_BASE}/posts/${postId}/delete/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let message = 'Could not delete this post.';
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string') message = data.message;
      else if (typeof data.detail === 'string') message = data.detail;
    }
    throw new Error(message);
  }

  return (data ?? { message: 'Deleted.' }) as { message: string };
}

// ── Shared response handler ─────────────────────────────
async function handleResponse(
  res: Response
): Promise<{ message: string; post: Post }> {
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    let message = 'Could not save the post.';
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

  return data as { message: string; post: Post };
}