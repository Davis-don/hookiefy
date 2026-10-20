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

/* ============================================================
   RESULT BUCKETS
   ============================================================ */

export type SearchResults = {
  businesses: SearchBusiness[];
  posts: SearchPost[];
  stories: SearchStory[];
  products: SearchProduct[];
  users: SearchUser[];
};

export type SearchKind = keyof SearchResults;

/* ── Per-kind row type, keyed by the bucket name ──── */

export type SearchRow<K extends SearchKind> = SearchResults[K][number];

/* ============================================================
   RESPONSE
   ============================================================ */

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
   HELPERS
   ============================================================ */

async function parseError(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (data && typeof data === 'object') {
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    if (typeof data.detail === 'string') return data.detail;

    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const val = data[firstKey];
      const first = Array.isArray(val) ? val[0] : String(val);
      return `${firstKey}: ${first}`;
    }
  }
  return fallback;
}

/* ============================================================
   SEARCH — GET /api/search/?q=…&kind=…&page=…
   ============================================================ */

export async function searchEverything(
  params: SearchParams,
  token?: string | null,
): Promise<SearchResponse> {
  const q = params.q.trim();
  const page = params.page ?? 1;

  if (q.length < 2) {
    return {
      query: q,
      kind: params.kind ?? 'all',
      page,
      page_size: 10,
      pages: {
        businesses: 0,
        posts: 0,
        stories: 0,
        products: 0,
        users: 0,
      },
      has_more: {
        businesses: false,
        posts: false,
        stories: false,
        products: false,
        users: false,
      },
      results: {
        businesses: [],
        posts: [],
        stories: [],
        products: [],
        users: [],
      },
      counts: {
        businesses: 0,
        posts: 0,
        stories: 0,
        products: 0,
        users: 0,
      },
      total: 0,
    };
  }

  const usp = new URLSearchParams();
  usp.set('q', q);
  if (params.kind) usp.set('kind', params.kind);
  usp.set('page', String(page));

  const url = `${API_BASE}/api/search/?${usp.toString()}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(await parseError(res, 'Search failed.'));
  }

  return (await res.json()) as SearchResponse;
}