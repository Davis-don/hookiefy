// src/features/perfTests/api/perfTestsApi.ts

import { useAuthStore } from '../../../store/authStore';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

export type ImageCycleResult = {
  image: string;
  image_size_kb: number;
  upload_seconds: number;
  delete_seconds: number;
  upload_ok: boolean;
  delete_ok: boolean;
  image_url: string | null;
  public_id: string | null;
  error: string | null;
};

export type FullCycleResult = {
  email: string;
  plan: string;
  timings: Record<string, number>;
  total_create_seconds: number;
  total_cleanup_seconds: number;
  error: string | null;
};

export type PerfRunResponse = {
  ok: boolean;
  result?: {
    image_cycle: ImageCycleResult;
    full_cycle: FullCycleResult;
    summary: {
      total_seconds: number;
      tests_run: number;
      tests_failed: number;
    };
  };
  message?: string;
};

export async function runPerfTests(): Promise<PerfRunResponse> {
  const access = useAuthStore.getState().access;
  if (!access) throw new Error('Not authenticated.');

  const res = await fetch(`${API_BASE}/perf/tests/run/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${access}`,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      data?.message || data?.detail || 'Could not run performance tests.',
    );
  }

  return data as PerfRunResponse;
}