// src/pages/stories/storiesApi.ts

import {useAuthStore} from '../../../store/authStore';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   TYPES
   ============================================================ */

export type StoryCategory =
  | 'journey'
  | 'motivation'
  | 'success'
  | 'experience'
  | 'lessons'
  | 'inspiration';

export type StoryPayload = {
  title: string;
  content: string;
  category: StoryCategory;
};

export type StoryUpdatePayload = Partial<StoryPayload>;

export type Story = {
  id: number;
  user: number;
  author_email: string;
  author_full_name: string;
  title: string;
  content: string;
  content_html: string;
  content_text: string;
  summary: string;
  category: StoryCategory;
  category_display: string;
  created_at: string;
  updated_at: string;
};

export type ListStoriesResponse = {
  count: number;
  results: Story[];
};

export type CreateStoryResponse = {
  message: string;
  story: Story;
};

export type UpdateStoryResponse = {
  message: string;
  story: Story;
};

export type DeleteStoryResponse = {
  message: string;
};

export type ListStoriesParams = {
  category?: StoryCategory;
  user?: number;
};

/* ============================================================
   AUTH HEADERS — reads token from zustand authStore
   ============================================================ */

function authHeaders(): HeadersInit {
  // Read the live token from the store (persisted via zustand/persist)
  const access = useAuthStore.getState().access;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (access) {
    headers['Authorization'] = `Bearer ${access}`;
  } else {
    // helpful while debugging — remove in production
    // eslint-disable-next-line no-console
    console.warn('[storiesApi] No access token found in authStore.');
  }

  return headers;
}

/* ============================================================
   HELPERS
   ============================================================ */

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function extractErrorMessage(data: any, fallback: string): string {
  if (!data) return fallback;
  if (typeof data === 'string') return data;

  if (typeof data === 'object') {
    if (typeof data.message === 'string') return data.message;
    if (typeof data.detail === 'string') return data.detail;

    const firstKey = Object.keys(data)[0];
    if (firstKey && Array.isArray(data[firstKey])) {
      return `${firstKey}: ${data[firstKey][0]}`;
    }
  }
  return fallback;
}

function buildQuery(params?: ListStoriesParams): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  if (params.category) usp.set('category', params.category);
  if (params.user != null) usp.set('user', String(params.user));
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

/* ============================================================
   CREATE — POST /stories/create/
   ============================================================ */

export async function createStory(
  payload: StoryPayload
): Promise<CreateStoryResponse> {
  const res = await fetch(`${API_BASE}/stories/create/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(extractErrorMessage(data, 'Failed to publish story.'));
  }

  return data as CreateStoryResponse;
}

/* ============================================================
   LIST MINE — GET /stories/mine/
   ============================================================ */

export async function listMyStories(
  params?: ListStoriesParams
): Promise<ListStoriesResponse> {
  const res = await fetch(
    `${API_BASE}/stories/mine/${buildQuery(params)}`,
    {
      method: 'GET',
      headers: authHeaders(),
    }
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data, 'Failed to load your stories.')
    );
  }

  return data as ListStoriesResponse;
}

/* ============================================================
   LIST ALL — GET /stories/
   ============================================================ */

export async function listAllStories(
  params?: ListStoriesParams
): Promise<ListStoriesResponse> {
  const res = await fetch(
    `${API_BASE}/stories/${buildQuery(params)}`,
    {
      method: 'GET',
      headers: authHeaders(),
    }
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(extractErrorMessage(data, 'Failed to load stories.'));
  }

  return data as ListStoriesResponse;
}

/* ============================================================
   RETRIEVE — GET /stories/<id>/
   ============================================================ */

export async function retrieveStory(id: number): Promise<Story> {
  const res = await fetch(`${API_BASE}/stories/${id}/`, {
    method: 'GET',
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(extractErrorMessage(data, 'Story not found.'));
  }

  return data as Story;
}

/* ============================================================
   UPDATE — PATCH /stories/<id>/update/
   ============================================================ */

export async function updateStory(
  id: number,
  payload: StoryUpdatePayload
): Promise<UpdateStoryResponse> {
  const res = await fetch(`${API_BASE}/stories/${id}/update/`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(extractErrorMessage(data, 'Failed to update story.'));
  }

  return data as UpdateStoryResponse;
}

/* ============================================================
   DELETE — DELETE /stories/<id>/delete/
   ============================================================ */

export async function deleteStory(
  id: number
): Promise<DeleteStoryResponse> {
  const res = await fetch(`${API_BASE}/stories/${id}/delete/`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(extractErrorMessage(data, 'Failed to delete story.'));
  }

  return (data ?? { message: 'Story deleted.' }) as DeleteStoryResponse;
}

/* ============================================================
   ADMIN — GET /stories/admin/all/
   ============================================================ */

export async function adminListStories(
  params?: ListStoriesParams
): Promise<ListStoriesResponse> {
  const res = await fetch(
    `${API_BASE}/stories/admin/all/${buildQuery(params)}`,
    {
      method: 'GET',
      headers: authHeaders(),
    }
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data, 'Failed to load stories (admin).')
    );
  }

  return data as ListStoriesResponse;
}