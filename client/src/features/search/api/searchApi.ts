// src/features/search/api/searchApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   SCOPES
   ============================================================ */

export type SearchScope =
  | 'all'
  | 'businesses'
  | 'posts'
  | 'stories'
  | 'products'
  | 'users';

/* ============================================================
   ITEM TYPES
   ============================================================ */

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

/* ── One streamed chunk per kind ──────────────────── */

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

/* ============================================================
   STREAMING SEARCH
   ============================================================
   Reads NDJSON line-by-line, calling `onChunk` for each kind
   as it arrives, then resolves when the "done" marker hits.
   ============================================================ */

export async function searchStreaming(
  params: { q: string; kind: SearchScope; page?: number },
  onChunk: (chunk: SearchChunk) => void,
  token?: string | null,
  signal?: AbortSignal,
): Promise<void> {
  const q = params.q.trim();
  const page = params.page ?? 1;

  if (q.length < 2) return;

  const usp = new URLSearchParams();
  usp.set('q', q);
  usp.set('kind', params.kind);
  usp.set('page', String(page));
  usp.set('stream', '1');

  const url = `${API_BASE}/api/search/?${usp.toString()}`;

  const headers: Record<string, string> = {
    Accept: 'application/x-ndjson',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers, signal });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Search failed (${res.status}${res.statusText ? ' ' + res.statusText : ''})` +
        (text ? `: ${text.slice(0, 200)}` : ''),
    );
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
          continue;
        }

        if (parsed.type === 'done') return;

        if (parsed.error) {
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