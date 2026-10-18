// src/features/perfTests/api/perfTestsApi.ts

import { useAuthStore } from '../../../store/authStore';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================
// TYPES
// ============================================================

export type DisplayValue = {
  value: string;
  unit: string;
  raw: number;
};

export type ImageUploadThroughput = {
  uploads_per_second: number;
  deletes_per_second: number;
  seconds_per_image: number;
  upload_display: DisplayValue;
};

export type ImageUploadResult = {
  runs: number;
  avg_upload_ms: number;
  min_upload_ms: number;
  max_upload_ms: number;
  avg_delete_ms: number;
  min_delete_ms: number;
  max_delete_ms: number;
  all_deleted: boolean;
  all_url_ok: boolean;
  throughput?: ImageUploadThroughput;
  details?: Array<{ bytes: number; upload_ms: number }>;
  error?: string;
};

export type OverallUploadThroughput = {
  posts_per_second: number;
  products_per_second: number;
  businesses_per_second: number;
  stories_per_second: number;
  users_per_second: number;
  image_uploads_per_second: number;
};

export type OverallUploadResult = {
  plan: string;
  posts: number;
  products: number;
  total_upload_ms: number;
  timings: Record<string, number>;
  throughput?: OverallUploadThroughput;
  error?: string;
};

export type EndpointTiming = {
  url: string;
  status: number | string;
  avg_ms: number;
  avg_bytes: number;
  samples_ms: number[];
  samples_bytes: number[];
};

export type OverallDownloadThroughput = {
  total_bytes_per_second: number;
  total_display: DisplayValue;
  endpoints_total_per_second: number;
  [key: string]: number | DisplayValue;
};

export type OverallDownloadResult = {
  business_id: number;
  timings: Record<string, EndpointTiming>;
  throughput?: OverallDownloadThroughput;
  error?: string;
};

export type PerfRunResponse = {
  ok: boolean;
  result?: {
    image_upload: ImageUploadResult;
    overall_upload: OverallUploadResult;
    overall_download: OverallDownloadResult;
    summary: {
      total_ms: number;
      tests_run: number;
      tests_failed: number;
      swept_orphans?: { swept_users: number };
    };
  };
  message?: string;
};

export type PerfRunOptions = {
  imageRuns?: number;
  posts?: number;
  products?: number;
};

// ============================================================
// FETCH
// ============================================================

export async function runPerfTests(
  options: PerfRunOptions = {},
): Promise<PerfRunResponse> {
  const access = useAuthStore.getState().access;
  if (!access) throw new Error('Not authenticated.');

  const { imageRuns = 3, posts = 3, products = 3 } = options;

  const params = new URLSearchParams();
  params.set('image_runs', String(imageRuns));
  params.set('posts', String(posts));
  params.set('products', String(products));

  const res = await fetch(
    `${API_BASE}/perf/tests/run/?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${access}`,
      },
    },
  );

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.detail ||
      'Could not run performance tests.';
    throw new Error(msg);
  }

  return data as PerfRunResponse;
}