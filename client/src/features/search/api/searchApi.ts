// src/features/search/api/searchApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

/* ============================================================
   TYPES
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

export type SearchResponse = {
  query: string;
  kind: SearchScope;
  results: SearchResults;
  counts: Record<keyof SearchResults, number>;
};

export type SearchParams = {
  q: string;
  kind?: SearchScope;
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
   SEARCH — GET /api/search/?q=…&kind=…
   ============================================================ */

export async function searchEverything(
  params: SearchParams,
  token?: string | null,
): Promise<SearchResponse> {
  const q = params.q.trim();

  if (q.length < 2) {
    /* Avoid a pointless network call for 0–1 char queries.
       Return an empty, well-formed response instead. */
    return {
      query: q,
      kind: params.kind ?? 'all',
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
    };
  }

  const usp = new URLSearchParams();
  usp.set('q', q);
  if (params.kind) usp.set('kind', params.kind);

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