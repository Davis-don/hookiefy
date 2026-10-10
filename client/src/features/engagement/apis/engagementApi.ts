// src/pages/engagement/engagementApi.ts

import { useAuthStore } from '../../../store/authStore';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   TYPES
   ============================================================ */

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
   TOGGLE FOLLOW — POST /my_engagements/follow/toggle/
   ============================================================ */

export async function toggleFollow(
  targetKind: TargetKind,
  targetId: number,
): Promise<ToggleResponse> {
  const res = await fetch(`${API_BASE}/my_engagements/follow/toggle/`, {
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
      extractErrorMessage(data, 'Failed to toggle follow.'),
    );
  }

  return data as ToggleResponse;
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