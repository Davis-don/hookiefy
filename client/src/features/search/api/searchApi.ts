// src/features/search/api/searchApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   SCOPES / TYPES (unchanged)
   ============================================================ */

export type SearchScope =
  | 'all'
  | 'businesses'
  | 'posts'
  | 'stories'
  | 'products'
  | 'users';

export type SearchBusiness = {
  id: number;
  business_name: string;
  business_type: string;
  business_category: string;
  description: string;
  county: string;
  city_town: string;
  region: string;
};

export type SearchPost = {
  id: number;
  title: string;
  body: string;
  image_url: string | null;
  business_id: number;
  business_name: string;
  created_at: string;
};

export type SearchStory = {
  id: number;
  title: string;
  summary: string;
  category: string;
  user_id: number;
  author: string;
  created_at: string;
};

export type SearchProduct = {
  id: number;
  name: string;
  description: string;
  price: string | null;
  image_url: string | null;
  business_id: number;
  business_name: string;
};

export type SearchUser = {
  id: number;
  full_name: string;
};

export type SearchResults = {
  businesses: SearchBusiness[];
  posts: SearchPost[];
  stories: SearchStory[];
  products: SearchProduct[];
  users: SearchUser[];
};

export type SearchKind = keyof SearchResults;
export type SearchRow<K extends SearchKind> = SearchResults[K][number];

/* ── One chunk per kind (streaming) ─────────────────── */

export type SearchChunk<K extends SearchKind = SearchKind> = {
  kind: K;
  page: number;
  page_size: number;
  items: SearchRow<K>[];
  total: number;
  total_pages: number;
  has_more: boolean;
  error?: string;
};

/* ── Full response (used only in non-streaming mode) ── */

export type SearchResponse = {
  query: string;
  kind: SearchScope;
  page: number;
  page_size: number;
  pages: Record<SearchKind, number>;
  has_more: Record<SearchKind, boolean>;
  results: SearchResults;
  counts: Record<SearchKind, number>;
  total: number;
};

export type SearchParams = {
  q: string;
  kind?: SearchScope;
  page?: number;
};

/* ============================================================
   SEARCH — streaming NDJSON
   ============================================================
   Calls `onChunk` once per kind (as soon as the backend
   finishes that kind), then resolves once the "done"
   marker arrives. Pass `onChunk` to wire results into
   React Query per-kind.
   ============================================================ */

export async function searchStreaming(
  params: SearchParams,
  onChunk: (chunk: SearchChunk) => void,
  token?: string | null,
  signal?: AbortSignal,
): Promise<void> {
  const q = params.q.trim();
  const page = params.page ?? 1;

  if (q.length < 2) return;

  const usp = new URLSearchParams();
  usp.set('q', q);
  if (params.kind) usp.set('kind', params.kind);
  usp.set('page', String(page));
  usp.set('stream', '1');

  const url = `${API_BASE}/api/search/?${usp.toString()}`;

  const headers: Record<string, string> = {
    Accept: 'application/x-ndjson',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers, signal });

  if (!res.ok || !res.body) {
    throw new Error('Search failed.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIdx).trim();
        buffer = buffer.slice(newlineIdx + 1);

        if (!line) continue;

        let parsed: any;
        try {
          parsed = JSON.parse(line);
        } catch {
          continue;  // skip malformed line
        }

        if (parsed.type === 'done') return;

        if (parsed.error) {
          // Per-kind error — surface but keep going
          onChunk({
            kind: parsed.kind,
            page,
            page_size: 0,
            items: [],
            total: 0,
            total_pages: 0,
            has_more: false,
            error: parsed.error,
          });
          continue;
        }

        onChunk(parsed as SearchChunk);
      }
    }
  } finally {
    reader.releaseLock();
  }
}