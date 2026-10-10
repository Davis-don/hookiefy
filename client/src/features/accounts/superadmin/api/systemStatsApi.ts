// src/features/systemStats/api/systemStatsApi.ts

import { useAuthStore } from '../../../../store/authStore';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'https://hookiefy-server-7d6d.onrender.com'
).replace(/\/+$/, '');


/* ── Types ─────────────────────────────────────────── */

export interface SystemUsersResponse {
  success: boolean;
  count: number;
  total: number;
  with_business: number;
  without_business: number;
  error?: string;
}

export interface SystemBusinessesResponse {
  success: boolean;
  count: number;
  error?: string;
}


/* ── Helpers ───────────────────────────────────────── */

function authHeaders(): HeadersInit {
  const access = useAuthStore.getState().access;
  return {
    'Content-Type': 'application/json',
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
  };
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (json as { error?: string } | null)?.error ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return json as T;
}


/* ── API calls ─────────────────────────────────────── */

/** GET /system_stats/users/ */
export async function fetchSystemUsersCount(): Promise<SystemUsersResponse> {
  const res = await fetch(`${API_BASE_URL}/system_stats/users/`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseJson<SystemUsersResponse>(res);
}

/** GET /system_stats/businesses/ */
export async function fetchSystemBusinessesCount(): Promise<SystemBusinessesResponse> {
  const res = await fetch(`${API_BASE_URL}/system_stats/businesses/`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseJson<SystemBusinessesResponse>(res);
}