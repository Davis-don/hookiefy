// src/features/feed/api/feedApi.ts

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================
// TYPES
// ============================================================

export type FeedBusinessMini = {
  id: number;
  business_name: string;
};

export type FeedOwnerMini = {
  profile_image_url: string | null;
};

export type FeedProperty = {
  name: string;
  value: string;
};

/**
 * A single feed item — either a post or a product.
 * The `kind` field tells you which optional fields are populated.
 */
export type FeedItem = {
  kind: 'post' | 'product';
  id: number;
  created_at: string;
  updated_at: string;
  views: number;

  // Shared
  image_url: string | null;
  business: FeedBusinessMini;
  owner: FeedOwnerMini | null;

  // Post-only
  title?: string;
  body?: string;
  image_public_id?: string | null;

  // Product-only
  name?: string;
  description?: string;
  price?: string | null;
  extra_images?: string[];
  properties?: FeedProperty[];
};

export type FeedResponse = {
  count: number;
  next_cursor: string | null;
  has_more: boolean;
  results: FeedItem[];
};

export type FetchFeedOptions = {
  kind?: 'all' | 'post' | 'product';
  limit?: number;
  before?: string | null;
  status?: 'active' | 'paused' | 'draft' | 'closed' | 'suspended' | 'all';
  category?: 'goods' | 'services';
};

// ============================================================
// HELPERS
// ============================================================

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

// ============================================================
// MY FEED — GET /feed/businesses/mine/
// Returns posts + products from OTHER businesses.
// ============================================================

export async function fetchMyFeed(
  token: string | null,
  options: FetchFeedOptions = {}
): Promise<FeedResponse> {
  if (!token) throw new Error('Not authenticated.');

  const params = new URLSearchParams();

  if (options.kind) params.set('kind', options.kind);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.before) params.set('before', options.before);
  if (options.status) params.set('status', options.status);
  if (options.category) params.set('category', options.category);

  const qs = params.toString();
  const url = `${API_BASE}/feed/businesses/mine/${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not load your feed.'));
  }

  return (await res.json()) as FeedResponse;
}

// ============================================================
// PUBLIC FEED — GET /feed/businesses/
// No auth required. Same shape as fetchMyFeed.
// ============================================================

export async function fetchPublicFeed(
  options: FetchFeedOptions = {}
): Promise<FeedResponse> {
  const params = new URLSearchParams();

  if (options.kind) params.set('kind', options.kind);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.before) params.set('before', options.before);
  if (options.category) params.set('category', options.category);

  const qs = params.toString();
  const url = `${API_BASE}/feed/businesses/${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(await parseError(res, 'Could not load the feed.'));
  }

  return (await res.json()) as FeedResponse;
}