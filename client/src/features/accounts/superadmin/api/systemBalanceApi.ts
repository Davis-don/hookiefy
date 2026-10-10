// src/features/systemBalance/api/systemBalanceApi.ts

import { useAuthStore } from '../../../../store/authStore';

/* ── Env-driven base URL ───────────────────────────── */
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'https://hookiefy-server-7d6d.onrender.com'
).replace(/\/+$/, '');


/* ── Types ─────────────────────────────────────────── */

export interface SystemBalanceData {
  id: number;
  balance: string;
  total_deposits: string;
  total_withdrawals: string;
  currency: string;
  updated_at: string;
  created_at: string;
}

export interface FetchSystemBalanceResponse {
  success: boolean;
  data: SystemBalanceData;
  error?: string;
}

export interface InitializeSystemBalanceResponse {
  success: boolean;
  created: boolean;
  message: string;
  data: SystemBalanceData;
  error?: string;
}

export interface AdjustSystemBalanceResponse {
  success: boolean;
  message?: string;
  data: SystemBalanceData;
  error?: string;
}

export type AdjustAction = 'credit' | 'debit';


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

/** GET /system_balance/fetch/ */
export async function fetchSystemBalance(): Promise<FetchSystemBalanceResponse> {
  const res = await fetch(`${API_BASE_URL}/system_balance/fetch/`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseJson<FetchSystemBalanceResponse>(res);
}

/** POST /system_balance/initialize/ — superuser only */
export async function initializeSystemBalance(): Promise<InitializeSystemBalanceResponse> {
  const res = await fetch(`${API_BASE_URL}/system_balance/initialize/`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return parseJson<InitializeSystemBalanceResponse>(res);
}

/** POST /system_balance/fetch/ — { amount, action } */
export async function adjustSystemBalance(
  amount: string,
  action: AdjustAction = 'credit',
): Promise<AdjustSystemBalanceResponse> {
  const res = await fetch(`${API_BASE_URL}/system_balance/fetch/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ amount, action }),
  });
  return parseJson<AdjustSystemBalanceResponse>(res);
}

/** PATCH /system_balance/fetch/ — { balance } */
export async function setSystemBalance(
  balance: string,
): Promise<AdjustSystemBalanceResponse> {
  const res = await fetch(`${API_BASE_URL}/system_balance/fetch/`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ balance }),
  });
  return parseJson<AdjustSystemBalanceResponse>(res);
}