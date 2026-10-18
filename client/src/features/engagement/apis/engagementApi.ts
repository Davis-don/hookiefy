// src/pages/engagement/engagementApi.ts

import { useAuthStore } from '../../../store/authStore';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   TYPES
   ============================================================ */

/** Content that can be LIKED. */
export type TargetKind = 'post' | 'product' | 'story';

export type EngagementStatus = {
  target_type: TargetKind;
  target_id: number;
  likes_count: number;
  follows_count: number;
  liked: boolean;
  followed: boolean;
};

export type ToggleResponse = {
  target_type: TargetKind;
  target_id: number;
  likes_count: number;
  follows_count: number;
  liked?: boolean;
  followed?: boolean;
};

/** Follow state for a BUSINESS. */
export type BusinessFollowStatus = {
  target_type: 'business';
  target_id: number;
  likes_count: number;
  follows_count: number;
  followed: boolean;
};

export type Liker = {
  id: number;
  user: number;
  user_full_name: string;
  user_email: string;
  user_profile_image: string | null;
  content_type_model: string;
  object_id: number;
  created_at: string;
};

/* ============================================================
   AUTH HEADERS
   ============================================================ */

function authHeaders(): HeadersInit {
  const access = useAuthStore.getState().access;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (access) headers['Authorization'] = `Bearer ${access}`;
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
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;

    // DRF field-level errors, e.g. { target_type: ["..."] }
    for (const key of Object.keys(data)) {
      const v = data[key];
      if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
      if (typeof v === 'string') return v;
    }
  }
  return fallback;
}

/* ============================================================
   FETCH STATUS — GET /my_engagements/status/
   ============================================================ */

export async function fetchEngagementStatus(
  targetKind: TargetKind,
  targetId: number,
): Promise<EngagementStatus> {
  const qs = new URLSearchParams({
    target_type: targetKind,
    target_id: String(targetId),
  });

  const res = await fetch(
    `${API_BASE}/my_engagements/status/?${qs.toString()}`,
    { method: 'GET', headers: authHeaders() },
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data, 'Failed to load engagement status.'),
    );
  }

  return data as EngagementStatus;
}

/* ============================================================
   FETCH BUSINESS FOLLOW STATUS
   GET /my_engagements/status/?target_type=business&target_id=<id>
   ============================================================ */

export async function fetchBusinessFollowStatus(
  businessId: number,
): Promise<BusinessFollowStatus> {
  const qs = new URLSearchParams({
    target_type: 'business',
    target_id: String(businessId),
  });

  const res = await fetch(
    `${API_BASE}/my_engagements/status/?${qs.toString()}`,
    { method: 'GET', headers: authHeaders() },
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data, 'Failed to load follow status.'),
    );
  }

  // The server returns a superset (likes + follows fields);
  // normalise into a stable shape.
  const raw: any = data ?? {};
  return {
    target_type: 'business',
    target_id: businessId,
    likes_count: raw.likes_count ?? 0,
    follows_count: raw.follows_count ?? 0,
    followed: !!raw.followed,
  };
}

/* ============================================================
   TOGGLE LIKE — POST /my_engagements/like/toggle/
   ============================================================ */

export async function toggleLike(
  targetKind: TargetKind,
  targetId: number,
): Promise<ToggleResponse> {
  const res = await fetch(`${API_BASE}/my_engagements/like/toggle/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      target_type: targetKind,
      target_id: targetId,
    }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data, 'Failed to toggle like.'),
    );
  }

  return data as ToggleResponse;
}

/* ============================================================
   TOGGLE FOLLOW — BUSINESS ONLY
   POST /my_engagements/follow/toggle/
   ============================================================ */

export async function toggleFollowBusiness(
  businessId: number,
): Promise<BusinessFollowStatus> {
  const res = await fetch(`${API_BASE}/my_engagements/follow/toggle/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      target_type: 'business',
      target_id: businessId,
    }),
  });

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data, 'Failed to toggle follow.'),
    );
  }

  const raw: any = data ?? {};
  return {
    target_type: 'business',
    target_id: businessId,
    likes_count: raw.likes_count ?? 0,
    follows_count: raw.follows_count ?? 0,
    followed: !!raw.followed,
  };
}

/* ============================================================
   LIST LIKERS — GET /my_engagements/likes/
   ============================================================ */

export async function fetchLikers(
  targetKind: TargetKind,
  targetId: number,
): Promise<Liker[]> {
  const qs = new URLSearchParams({
    target_type: targetKind,
    target_id: String(targetId),
  });

  const res = await fetch(
    `${API_BASE}/my_engagements/likes/?${qs.toString()}`,
    { method: 'GET', headers: authHeaders() },
  );

  const data = await parseJsonSafe(res);

  if (!res.ok) {
    throw new Error(
      extractErrorMessage(data, 'Failed to load likers.'),
    );
  }

  return data as Liker[];
}